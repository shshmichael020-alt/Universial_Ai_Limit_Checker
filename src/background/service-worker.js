import { DEFAULT_SETTINGS, getState } from "../utils/storage.js";
import { refreshUsage } from "../services/usage-service.js";
import { notifyIfNeeded } from "../services/notification-service.js";
import { calculateIntelligence } from "../utils/intelligence.js";
import { ChatGPTProvider } from "../providers/chatgpt.js";
import { ClaudeProvider } from "../providers/claude.js";
import { GeminiProvider } from "../providers/gemini.js";
import { CopilotProvider } from "../providers/copilot.js";
import { mergeUsageSources, hasUsageData } from "../services/source-resolver.js";
import { appendActivityEvent, summarizeActivity } from "../services/activity-ledger.js";
import { reconcile } from "../services/reconciliation.js";
import { selectPrimaryLimit } from "../utils/limit-selection.js";

const chatgptProvider = new ChatGPTProvider();
const visibleAdapters = {
  chatgpt: chatgptProvider,
  claude: new ClaudeProvider(),
  gemini: new GeminiProvider(),
  copilot: new CopilotProvider()
};

// Temporary diagnostic for Service Worker DevTools; isolated from normal refresh/storage flow.
self.__AI_LIMIT_DEBUG_CHATGPT = async () => {
  try {
    await chatgptProvider.getUsage();
    const diagnostic = chatgptProvider.getApiDiagnostic();
    return {
      endpoint: diagnostic.endpoint,
      requestMade: Boolean(diagnostic.requestMade),
      status: diagnostic.status ?? null,
      authenticated: Boolean(diagnostic.authenticated),
      hasRateLimit: Boolean(diagnostic.hasRateLimit),
      parsedLimitIds: Array.isArray(diagnostic.parsedLimitIds) ? diagnostic.parsedLimitIds : [],
      parsedPercentages: Array.isArray(diagnostic.parsedPercentages) ? diagnostic.parsedPercentages : [],
      creditsDetected: Boolean(diagnostic.creditsDetected),
      sourceSelected: diagnostic.sourceSelected || "unavailable",
      errorCategory: diagnostic.errorCategory || null
    };
  } catch {
    return {
      endpoint: "/backend-api/wham/usage",
      requestMade: false,
      status: null,
      authenticated: false,
      hasRateLimit: false,
      parsedLimitIds: [],
      parsedPercentages: [],
      creditsDetected: false,
      sourceSelected: "unavailable",
      errorCategory: "other"
    };
  }
};
let stateOperation = Promise.resolve();

function enqueueStateOperation(operation) {
  const next = stateOperation.then(operation, operation);
  stateOperation = next.catch(() => {});
  return next;
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["settings"]);
  const settings = { ...DEFAULT_SETTINGS, ...(existing.settings || {}) };
  if (!existing.settings?.settingsVersion) settings.demoMode = false;
  settings.settingsVersion = DEFAULT_SETTINGS.settingsVersion;

  await chrome.storage.local.set({ settings });

  schedule(settings.refreshMinutes);
  await enqueueStateOperation(updateUsage);
});

chrome.runtime.onStartup.addListener(async () => {
  const { settings = DEFAULT_SETTINGS } =
    await chrome.storage.local.get("settings");

  schedule(settings.refreshMinutes);
  await enqueueStateOperation(updateUsage);
});

function schedule(minutes) {
  chrome.alarms.clear("ai-limit-refresh");
  chrome.alarms.create("ai-limit-refresh", {
    periodInMinutes: Math.max(1, Number(minutes) || 5)
  });
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== "ai-limit-refresh") return;
  await enqueueStateOperation(updateUsage);
});

async function updateUsage() {
  const state = await chrome.storage.local.get(["settings", "history", "usage"]);
  const refreshed = await refreshUsage();
  const usage = {};
  for (const [provider, next] of Object.entries(refreshed)) {
    const previous = state.usage?.[provider];
    const nextHasData = hasUsageData(next);
    const previousCanBeCached = previous && ["live", "detected", "cached", "manual"].includes(previous.status) && previous.limits?.length;
    usage[provider] = nextHasData ? mergeUsageSources(previous, next) : !previousCanBeCached ? next : {
      ...previous,
      status: "cached",
      staleSince: previous.staleSince || Date.now(),
      refreshError: next.status === "error" ? "Provider refresh failed" : "Usage source unavailable"
    };
  }
  const timestamp = Date.now();
  const retentionMs = Math.max(1, Number(state.settings?.historyDays) || 30) * 86400000;
  const hasFreshData = Object.values(refreshed).some(entry =>
    ["demo", "manual", "live", "detected"].includes(entry?.status) &&
    hasUsageData(entry)
  );
  const history = (hasFreshData ? [...(state.history || []), { timestamp, usage }] : [...(state.history || [])])
    .filter(snapshot => timestamp - Number(snapshot.timestamp) <= retentionMs)
    .slice(-1000);
  Object.keys(usage).forEach(provider => {
    usage[provider].insights = calculateIntelligence(history, provider, usage[provider]);
  });
  await chrome.storage.local.set({ usage, history, lastUpdated: timestamp });

  for (const [provider, entry] of Object.entries(usage)) {
    const limit = selectPrimaryLimit(entry);
    await notifyIfNeeded(provider, Number(limit?.percentage), state.settings || DEFAULT_SETTINGS, limit);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "REPORT_VISIBLE_USAGE") {
    enqueueStateOperation(() => saveVisibleUsage(message.usage))
      .then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (["CHATGPT_ACTIVITY_EVENT", "PROVIDER_ACTIVITY_EVENT"].includes(message?.type)) {
    enqueueStateOperation(() => saveActivityEvent(message.event))
      .then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "GET_STATE") {
    getState().then(state => sendResponse({ ok: true, state }));
    return true;
  }

  if (message?.type === "GET_CHATGPT_API_DIAGNOSTICS") {
    sendResponse({ ok: true, diagnostic: chatgptProvider.getApiDiagnostic() });
    return false;
  }

  if (message?.type === "SET_REFRESH") {
    schedule(message.minutes);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "REFRESH_NOW") {
    enqueueStateOperation(updateUsage)
      .then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function saveVisibleUsage(candidate) {
  if (candidate?.provider === "chatgpt" && !candidate.limits?.length) {
    await markChatgptUnavailable();
    return;
  }
  if (candidate?.provider === "chatgpt") console.debug("[AI-LIMIT][CHATGPT] parsed observation", candidate);
  const adapter = visibleAdapters[candidate?.provider];
  const normalized = adapter ? adapter.normalizeVisibleUsage(candidate) : null;
  if (!normalized) {
    if (candidate?.provider === "chatgpt") console.debug("[AI-LIMIT][CHATGPT] No provider-visible usage information found");
    return;
  }
  if (candidate?.provider === "chatgpt") console.debug("[AI-LIMIT][CHATGPT] normalized observation", normalized);
  const validLimits = normalized.limits;

  const state = await chrome.storage.local.get(["usage", "history", "settings", "manualLimits"]);
  const manual = state.settings?.demoMode || state.manualLimits?.[candidate.provider];
  if (manual) return;
  const timestamp = Date.now();
  const merged = mergeUsageSources(state.usage?.[normalized.provider], normalized);
  const usage = { ...(state.usage || {}), [normalized.provider]: { ...merged, updatedAt: timestamp } };
  const retentionMs = Math.max(1, Number(state.settings?.historyDays) || 30) * 86400000;
  const history = [...(state.history || []), { timestamp, usage }]
    .filter(snapshot => timestamp - Number(snapshot.timestamp) <= retentionMs)
    .slice(-1000);
  usage[normalized.provider].insights = calculateIntelligence(history, normalized.provider, usage[normalized.provider]);
  await chrome.storage.local.set({ usage, history, lastUpdated: timestamp });
  if (normalized.provider === "chatgpt") console.debug("[AI-LIMIT][CHATGPT] storage updated", usage[normalized.provider]);
  const limit = selectPrimaryLimit(merged);
  await notifyIfNeeded(normalized.provider, Number(limit?.percentage), state.settings || DEFAULT_SETTINGS, limit);
}

async function markChatgptUnavailable() {
  const state = await chrome.storage.local.get(["usage"]);
  const previous = state.usage?.chatgpt;
  if (!previous?.limits?.length || !["detected", "live", "cached"].includes(previous.status)) return;
  const usage = {
    ...(state.usage || {}),
    chatgpt: { ...previous, status: "cached", staleSince: previous.staleSince || Date.now() }
  };
  await chrome.storage.local.set({ usage });
  console.debug("[AI-LIMIT][CHATGPT] storage updated", usage.chatgpt);
}

async function saveActivityEvent(event) {
  const state = await chrome.storage.local.get(["activityEvents", "activitySummary", "activitySummaries", "usage"]);
  const previous = state.activityEvents || [];
  const generationPrefix = event?.eventId?.replace(/^output:/, "input:");
  const candidates = event?.source === "provider-reported" && generationPrefix ?
    previous.filter(item => item.eventId !== generationPrefix) : previous;
  const activityEvents = appendActivityEvent(candidates, event);
  const activitySummary = summarizeActivity(activityEvents, Date.now(), event.provider);
  const quotaLimit = state.usage?.[event.provider]?.limits?.find(limit => limit.percentage != null) || null;
  const reconciled = reconcile(quotaLimit, activitySummary);
  const activitySummaries = {
    ...(state.activitySummaries || {}),
    ...(state.activitySummary && !state.activitySummaries?.chatgpt ? { chatgpt: state.activitySummary } : {}),
    [event.provider]: { ...activitySummary, reconciliation: reconciled.reconciliation }
  };
  await chrome.storage.local.set({
    activityEvents,
    activitySummaries,
    activitySummary: activitySummaries.chatgpt
  });
}

