import { ProviderAdapter } from "./provider-interface.js";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resetTimestamp(value) {
  if (value == null) return null;
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return Date.parse(value);
  const number = numberOrNull(value);
  if (number == null) return null;
  return number < 100000000000 ? number * 1000 : number;
}

function windowName(id, window) {
  const seconds = numberOrNull(window.limit_window_seconds);
  if (seconds != null) {
    const hours = seconds / 3600;
    if (hours >= 167) return `${id} weekly limit`;
    if (hours >= 23) return `${id} daily limit`;
    return `${hours % 1 ? hours.toFixed(1) : hours}-hour limit`;
  }
  return `${id} limit`;
}

function parseWindow(id, window) {
  if (!window || typeof window !== "object") return null;
  const usedPercent = numberOrNull(window.used_percent ?? window.used_percentage ?? window.percentage);
  const used = numberOrNull(window.used ?? window.used_count);
  const limit = numberOrNull(window.limit ?? window.max ?? window.total);
  const remaining = numberOrNull(window.remaining ?? window.remaining_count);
  const resetAt = resetTimestamp(window.reset_at ?? window.resetAt ?? window.reset_time);
  if ([usedPercent, used, limit, remaining, resetAt].every(value => value == null)) return null;
  const percentage = usedPercent ?? (used != null && limit > 0 ? (used / limit) * 100 : null);
  return {
    id: `chatgpt-${id}`,
    name: windowName(id, window),
    type: "rolling_usage",
    used,
    limit,
    remaining: remaining ?? (used != null && limit != null ? Math.max(0, limit - used) : null),
    percentage,
    period: "rolling",
    resetAt,
    model: window.model || window.model_id || null,
    source: "provider-api",
    confidence: "high",
    estimated: false,
    sourceDetail: "GET /backend-api/wham/usage"
  };
}

function parseCredits(credits) {
  if (credits == null) return null;
  const object = typeof credits === "object" ? credits : { remaining: credits };
  const remaining = numberOrNull(object.remaining ?? object.credits_left ?? object.amount ?? object.balance);
  const displayValue = object.displayValue || object.display_value ||
    (remaining != null ? `${remaining} credits left` : null);
  if (remaining == null && displayValue == null) return null;
  return {
    id: "credits",
    name: "Credits",
    type: "credits",
    used: null,
    limit: null,
    remaining,
    percentage: null,
    period: null,
    resetAt: resetTimestamp(object.reset_at ?? object.resetAt),
    model: null,
    displayValue,
    source: "provider-api",
    confidence: "high",
    estimated: false,
    sourceDetail: "GET /backend-api/wham/usage"
  };
}

function parseUsage(payload) {
  if (!payload || typeof payload !== "object") return [];
  const limits = [];
  for (const [id, window] of Object.entries({
    primary: payload.rate_limit?.primary_window,
    secondary: payload.rate_limit?.secondary_window
  })) {
    const parsed = parseWindow(id, window);
    if (parsed) limits.push(parsed);
  }
  for (const [index, entry] of (payload.additional_rate_limits || []).entries()) {
    const parsed = parseWindow(entry?.id || entry?.name || `additional-${index + 1}`, entry?.window || entry);
    if (parsed) limits.push(parsed);
  }
  const credits = parseCredits(payload.credits);
  if (credits) limits.push(credits);
  return limits;
}

export class ChatGPTProvider extends ProviderAdapter {
  constructor() {
    super("chatgpt");
    this.lastApiDiagnostic = {
      endpoint: "/backend-api/wham/usage",
      requestMade: false,
      status: null,
      authenticated: false,
      hasRateLimit: false,
      parsedLimitIds: [],
      parsedPercentages: [],
      creditsDetected: false,
      sourceSelected: "unavailable",
      errorCategory: null
    };
  }

  async getUsage() {
    const endpoint = "/backend-api/wham/usage";
    const baseDiagnostic = { endpoint, requestMade: true };
    try {
      const response = await fetch(USAGE_URL, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) {
        this.lastApiDiagnostic = {
          ...baseDiagnostic,
          status: response.status,
          authenticated: response.status !== 401 && response.status !== 403,
          hasRateLimit: false,
          parsedLimitIds: [],
          parsedPercentages: [],
          creditsDetected: false,
          sourceSelected: "unavailable",
          errorCategory: response.status === 401 ? "unauthorized" :
            response.status === 403 ? "forbidden" : response.status >= 500 ? "server-error" : "other"
        };
        console.debug("[AI-LIMIT][CHATGPT][API] request", this.lastApiDiagnostic);
        return { provider: this.provider, status: "unavailable", source: "unavailable", limits: [], error: `ChatGPT usage endpoint returned ${response.status}` };
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        this.lastApiDiagnostic = {
          ...baseDiagnostic,
          status: response.status,
          authenticated: true,
          hasRateLimit: false,
          parsedLimitIds: [],
          parsedPercentages: [],
          creditsDetected: false,
          sourceSelected: "unavailable",
          errorCategory: "parser-error"
        };
        console.debug("[AI-LIMIT][CHATGPT][API] request", this.lastApiDiagnostic);
        return { provider: this.provider, status: "unavailable", source: "unavailable", limits: [], error: "ChatGPT usage response could not be parsed" };
      }
      const limits = parseUsage(payload);
      this.lastApiDiagnostic = {
        ...baseDiagnostic,
        status: response.status,
        authenticated: true,
        hasRateLimit: Boolean(payload?.rate_limit),
        parsedLimitIds: limits.map(limit => limit.id),
        parsedPercentages: limits.filter(limit => limit.percentage != null).map(limit => ({ id: limit.id, percentage: limit.percentage })),
        creditsDetected: limits.some(limit => limit.id === "credits"),
        sourceSelected: limits.length ? "provider-api" : "unavailable",
        errorCategory: limits.length ? null : "invalid-response"
      };
      console.debug("[AI-LIMIT][CHATGPT][API] request", this.lastApiDiagnostic);
      return limits.length ? {
        provider: this.provider,
        status: "live",
        source: "provider-api",
        confidence: "high",
        updatedAt: Date.now(),
        limits
      } : { provider: this.provider, status: "unavailable", source: "unavailable", limits: [] };
    } catch (error) {
      this.lastApiDiagnostic = {
        ...baseDiagnostic,
        status: null,
        authenticated: false,
        hasRateLimit: false,
        parsedLimitIds: [],
        parsedPercentages: [],
        creditsDetected: false,
        sourceSelected: "unavailable",
        errorCategory: error?.name === "TypeError" ? "network-error" : "other"
      };
      console.debug("[AI-LIMIT][CHATGPT][API] request", this.lastApiDiagnostic);
      return { provider: this.provider, status: "unavailable", source: "unavailable", limits: [], error: error?.message || "ChatGPT usage request failed" };
    }
  }

  getApiDiagnostic() {
    return { ...this.lastApiDiagnostic };
  }

  normalizeVisibleUsage(candidate) {
    const normalized = super.normalizeVisibleUsage(candidate);
    if (!normalized) return null;
    return {
      ...normalized,
      limits: normalized.limits.map(limit => ({ ...limit, source: limit.source || "provider-visible" }))
    };
  }
}

export { parseUsage };
