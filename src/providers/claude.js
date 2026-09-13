import { ProviderAdapter } from "./provider-interface.js";

const CLAUDE_SESSION_TOKEN_LIMIT = 90000;
const CLAUDE_WEEKLY_TOKEN_LIMIT = 1260000;

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resetTimestamp(value) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return Date.parse(value);
  const number = numberOrNull(value);
  return number == null ? null : number < 100000000000 ? number * 1000 : number;
}

function findOrganization(value) {
  if (!value || typeof value !== "object") return null;
  for (const key of ["uuid", "id", "organization_id", "organizationId"]) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key];
  }
  for (const child of Object.values(value)) {
    const result = findOrganization(child);
    if (result) return result;
  }
  return null;
}

function utilizationPercent(value) {
  const number = numberOrNull(value);
  if (number == null) return null;
  return Math.max(0, Math.min(100, number <= 1 ? number * 100 : number));
}

function parseWindow(id, item, name, period, tokenLimit) {
  if (!item || typeof item !== "object") return null;
  const percentage = utilizationPercent(item.utilization ?? item.used_percent ?? item.usedPercentage ?? item.percentage);
  if (percentage == null) return null;
  const used = Math.round((percentage / 100) * tokenLimit);
  return {
    id,
    name,
    used,
    limit: tokenLimit,
    remaining: Math.max(0, tokenLimit - used),
    percentage,
    period,
    resetAt: resetTimestamp(item.resets_at ?? item.reset_at ?? item.resetAt ?? item.reset_time),
    model: null,
    source: "provider-api",
    confidence: "high",
    estimated: false,
    tokenEstimated: true,
    sourceDetail: "Claude first-party utilization; token count estimated using AIRadar's 90K/1.26M reference windows"
  };
}

function parseUsage(payload) {
  if (!payload || typeof payload !== "object") return [];
  const windows = payload.message_limit?.windows || payload.windows || {};
  const fiveHour = payload.five_hour || windows["5h"];
  const sevenDay = payload.seven_day || windows["7d"];
  const windowLimits = [
    parseWindow("claude-session-5h", fiveHour, "Claude 5-hour window · 90K tokens", "rolling-5h", CLAUDE_SESSION_TOKEN_LIMIT),
    parseWindow("claude-weekly-7d", sevenDay, "Claude weekly window · 1.26M tokens", "rolling-7d", CLAUDE_WEEKLY_TOKEN_LIMIT)
  ].filter(Boolean);
  if (windowLimits.length) return windowLimits;

  const limits = [];
  const entries = payload.limits || payload.usage || payload.rate_limits || payload;
  for (const [key, item] of Object.entries(entries || {})) {
    if (!item || typeof item !== "object") continue;
    const percentage = numberOrNull(item.used_percent ?? item.usedPercentage ?? item.percentage);
    const used = numberOrNull(item.used ?? item.used_count);
    const limit = numberOrNull(item.limit ?? item.max ?? item.total);
    const remaining = numberOrNull(item.remaining ?? item.remaining_count);
    const resetAt = resetTimestamp(item.reset_at ?? item.resetAt ?? item.reset_time);
    if ([percentage, used, limit, remaining, resetAt].every(value => value == null)) continue;
    limits.push({
      id: `claude-${key}`,
      name: item.name || key,
      used,
      limit,
      remaining: remaining ?? (used != null && limit != null ? Math.max(0, limit - used) : null),
      percentage: percentage ?? (used != null && limit > 0 ? (used / limit) * 100 : null),
      period: item.period || "provider-session",
      resetAt,
      model: item.model || null,
      source: "provider-api",
      confidence: "high",
      estimated: false,
      sourceDetail: "Claude first-party usage endpoint"
    });
  }
  return limits;
}

async function getJson(url) {
  const response = await fetch(url, { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
  return response.ok ? response.json() : null;
}

export class ClaudeProvider extends ProviderAdapter {
  constructor() {
    super("claude");
  }

  async getUsage() {
    try {
      const organizations = await getJson("https://claude.ai/api/organizations");
      const organization = findOrganization(organizations);
      if (!organization) return { provider: this.provider, status: "unavailable", source: "unavailable", limits: [], error: "Claude organization discovery unavailable" };
      const payload = await getJson(`https://claude.ai/api/organizations/${encodeURIComponent(organization)}/usage`);
      const limits = parseUsage(payload);
      return limits.length ? {
        provider: this.provider,
        status: "live",
        source: "provider-api",
        confidence: "high",
        updatedAt: Date.now(),
        limits
      } : { provider: this.provider, status: "unavailable", source: "unavailable", limits: [] };
    } catch (error) {
      return { provider: this.provider, status: "unavailable", source: "unavailable", limits: [], error: error?.message || "Claude usage request failed" };
    }
  }
}

export { parseUsage };
