export class ProviderAdapter {
  constructor(provider) {
    this.provider = provider;
  }

  async getUsage() {
    return {
      provider: this.provider,
      status: "unavailable",
      source: "unavailable",
      limits: []
    };
  }

  normalizeVisibleUsage(candidate) {
    if (!candidate || candidate.provider !== this.provider || !Array.isArray(candidate.limits)) return null;
    const limits = candidate.limits.filter(limit => limit &&
      [limit.used, limit.limit, limit.remaining, limit.percentage, limit.resetAt, limit.displayValue]
        .some(value => value != null) &&
      (limit.used == null || Number.isFinite(Number(limit.used))) &&
      (limit.limit == null || (Number.isFinite(Number(limit.limit)) && Number(limit.limit) > 0)) &&
      (limit.remaining == null || Number.isFinite(Number(limit.remaining))) &&
      (limit.percentage == null || (Number.isFinite(Number(limit.percentage)) && Number(limit.percentage) >= 0 && Number(limit.percentage) <= 100))
    ).map(limit => ({
      id: limit.id || `${this.provider}-visible-usage`,
      name: limit.name || "Visible usage",
      type: limit.type || "unknown",
      used: limit.used == null ? null : Number(limit.used),
      limit: limit.limit == null ? null : Number(limit.limit),
      remaining: limit.remaining == null ? null : Number(limit.remaining),
      percentage: limit.percentage == null ? null : Number(limit.percentage),
      period: limit.period || null,
      resetAt: limit.resetAt == null ? null : limit.resetAt,
      model: limit.model || null,
      source: candidate.source === "estimated" ? "estimated" : "provider-visible",
      confidence: limit.confidence || "high",
      estimated: limit.estimated === true || candidate.source === "estimated",
      tokenEstimated: limit.tokenEstimated === true,
      sourceDetail: limit.sourceDetail || "visible DOM",
      ...(limit.displayValue == null ? {} : { displayValue: String(limit.displayValue) })
    }));
    if (!limits.length) return null;
    return {
      provider: this.provider,
      status: candidate.source === "estimated" ? "estimated" : "detected",
      source: candidate.source === "estimated" ? "estimated" : "provider-visible",
      confidence: candidate.confidence || "high",
      updatedAt: Date.now(),
      limits
    };
  }
}
