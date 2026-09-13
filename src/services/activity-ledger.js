const RETENTION_MS = 7 * 86400000;
import { buildActivityModel } from "./activity-model.js";

function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

export function normalizeActivityEvent(event) {
  if (!event || event.provider !== "chatgpt") return null;
  const inputTokens = finite(event.inputTokens);
  const outputTokens = finite(event.outputTokens);
  const totalTokens = finite(event.totalTokens) ??
    (inputTokens != null || outputTokens != null ? (inputTokens || 0) + (outputTokens || 0) : null);
  if (inputTokens == null && outputTokens == null && totalTokens == null) return null;
  return {
    timestamp: Number.isFinite(Number(event.timestamp)) ? Number(event.timestamp) : Date.now(),
    provider: "chatgpt",
    model: event.model || null,
    inputTokens,
    outputTokens,
    totalTokens,
    durationMs: finite(event.durationMs),
    source: event.source || "tokenizer-estimate",
    confidence: event.confidence || "medium",
    eventId: String(event.eventId || `${Date.now()}-${Math.random()}`)
  };
}

export function appendActivityEvent(events, event, now = Date.now()) {
  const normalized = normalizeActivityEvent(event);
  if (!normalized || events.some(item => item.eventId === normalized.eventId)) return events || [];
  return [...(events || []), normalized]
    .filter(item => now - Number(item.timestamp) <= RETENTION_MS)
    .slice(-5000);
}

export function summarizeActivity(events, now = Date.now()) {
  const valid = (events || []).filter(item => item.provider === "chatgpt");
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const fiveHours = now - 5 * 3600000;
  const sevenDays = now - 7 * 86400000;
  const sum = list => list.reduce((total, item) => total + (Number(item.totalTokens) || 0), 0);
  const today = valid.filter(item => item.timestamp >= dayStart.getTime());
  const rollingFiveHours = valid.filter(item => item.timestamp >= fiveHours);
  const rollingSevenDays = valid.filter(item => item.timestamp >= sevenDays);
  const latest = valid[valid.length - 1] || null;
  const activityWindow = rollingFiveHours.filter(item => item.timestamp >= now - 3600000);
  const firstTime = activityWindow[0]?.timestamp;
  const lastTime = activityWindow.at(-1)?.timestamp;
  const minutes = firstTime != null && lastTime > firstTime ? (lastTime - firstTime) / 60000 : null;
  const durationMinutes = activityWindow.length === 1 && activityWindow[0].durationMs >= 60000 ?
    activityWindow[0].durationMs / 60000 : null;
  const burnRate = activityWindow.length >= 2 && minutes >= 1 ? sum(activityWindow) / minutes :
    durationMinutes ? sum(activityWindow) / durationMinutes : null;
  const inputTokens = sum(today.map(item => ({ totalTokens: item.inputTokens })));
  const outputTokens = sum(today.map(item => ({ totalTokens: item.outputTokens })));
  const model = buildActivityModel(valid, { now });
  return {
    currentConversationTokens: null,
    tokensToday: sum(today),
    tokensFiveHours: sum(rollingFiveHours),
    tokensSevenDays: sum(rollingSevenDays),
    messagesToday: today.length,
    messagesFiveHours: rollingFiveHours.length,
    lastGenerationTokens: latest?.totalTokens ?? null,
    lastGenerationAt: latest?.timestamp || null,
    lastGenerationDurationMs: latest?.durationMs ?? null,
    inputTokens,
    outputTokens,
    burnRate,
    lastActivityAt: latest?.timestamp || null,
    source: latest?.source || null,
    confidence: latest?.confidence || null
    ,activityModel: model
  };
}

export { RETENTION_MS };
