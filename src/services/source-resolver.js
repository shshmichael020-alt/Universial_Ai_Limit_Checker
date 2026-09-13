const SOURCE_PRIORITY = {
  "provider-api": 4,
  "provider-visible": 3,
  estimated: 2,
  cached: 1,
  unavailable: 0
};

export function sourcePriority(source) {
  return SOURCE_PRIORITY[source] ?? 0;
}

export function hasLimitData(limit) {
  return Boolean(limit && [limit.used, limit.limit, limit.remaining, limit.percentage, limit.resetAt, limit.displayValue]
    .some(value => value != null));
}

export function hasUsageData(entry) {
  return Boolean(entry?.limits?.some(hasLimitData));
}

export function mergeUsageSources(current, incoming) {
  if (!incoming?.limits?.length) return current || incoming || null;
  if (current?.status === "manual" || current?.status === "demo") return current;
  if (incoming.status === "manual" || incoming.status === "demo") return incoming;
  if (!current?.limits?.length) return incoming;

  const limitsById = new Map(current.limits.map(limit => [limit.id, limit]));
  for (const limit of incoming.limits) {
    const existing = limitsById.get(limit.id);
    const exhaustedProviderSignal = limit.source === "provider-visible" &&
      limit.confidence === "high" && Number(limit.percentage) === 100 && Number(limit.remaining) === 0;
    if (!existing || exhaustedProviderSignal || sourcePriority(limit.source) >= sourcePriority(existing.source)) {
      limitsById.set(limit.id, limit);
    }
  }

  const limits = [...limitsById.values()];
  const bestSource = limits.reduce((best, limit) =>
    sourcePriority(limit.source) > sourcePriority(best) ? limit.source : best, "unavailable");
  const statusBySource = { "provider-api": "live", "provider-visible": "detected", estimated: "estimated", cached: "cached", unavailable: "unavailable" };
  return {
    ...(current || {}),
    ...incoming,
    status: statusBySource[bestSource] || incoming.status || current.status || "detected",
    source: bestSource,
    confidence: limits.some(limit => limit.confidence === "high") ? "high" : "medium",
    limits,
    updatedAt: incoming.updatedAt || current.updatedAt || Date.now()
  };
}

export function unavailableUsage(provider, error = null) {
  return { provider, status: "unavailable", source: "unavailable", limits: [], error };
}
