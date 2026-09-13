export function getPrimaryLimit(entry) {
  return entry?.limits?.find(limit => Number.isFinite(Number(limit?.percentage))) || entry?.limits?.[0] || null;
}

export function calculateIntelligence(history, provider, current) {
  const samples = (history || [])
    .map(snapshot => ({
      timestamp: Number(snapshot.timestamp),
      percentage: Number(getPrimaryLimit(snapshot.usage?.[provider])?.percentage)
    }))
    .filter(sample => Number.isFinite(sample.timestamp) && Number.isFinite(sample.percentage))
    .slice(-20);

  const currentPercentage = Number(getPrimaryLimit(current)?.percentage);
  if (!Number.isFinite(currentPercentage) || samples.length < 2) {
    return { ratePerHour: null, trend: "unknown", estimatedExhaustionHours: null, projectedRisk: "unknown" };
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const hours = (last.timestamp - first.timestamp) / 3600000;
  const ratePerHour = hours > 0 ? (last.percentage - first.percentage) / hours : null;
  const trend = ratePerHour == null ? "unknown" : ratePerHour > 0.25 ? "rising" : ratePerHour < -0.25 ? "falling" : "steady";
  const remaining = Math.max(0, 100 - currentPercentage);
  const estimatedExhaustionHours = ratePerHour > 0 ? remaining / ratePerHour : null;
  const projectedRisk = estimatedExhaustionHours != null && estimatedExhaustionHours <= 4 ? "high" :
    estimatedExhaustionHours != null && estimatedExhaustionHours <= 12 ? "watch" : "low";

  return { ratePerHour, trend, estimatedExhaustionHours, projectedRisk };
}

export function formatEstimate(hours) {
  if (!Number.isFinite(hours)) return "Unavailable";
  if (hours < 1) return `~${Math.max(1, Math.round(hours * 60))}m`;
  return `~${Math.round(hours * 10) / 10}h`;
}
