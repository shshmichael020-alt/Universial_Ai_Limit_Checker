function sum(events, key = "totalTokens") {
  return (events || []).reduce((total, event) => total + (Number(event[key]) || 0), 0);
}

function confidenceFor(source, divergence) {
  if (divergence != null && divergence > 0.25) return "low";
  if (source === "provider-reported" || source === "local-o200k") return "high";
  return "medium";
}

export function calculateDivergence(primary, secondary) {
  if (!Number.isFinite(Number(primary)) || !Number.isFinite(Number(secondary)) || Number(primary) === 0) return null;
  return Math.abs(Number(primary) - Number(secondary)) / Math.abs(Number(primary));
}

export function buildActivityModel(events, options = {}) {
  const now = options.now || Date.now();
  const valid = (events || []).filter(event => event.provider === "chatgpt");
  const fiveHours = valid.filter(event => now - event.timestamp <= 5 * 3600000);
  const sevenDays = valid.filter(event => now - event.timestamp <= 7 * 86400000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const today = valid.filter(event => event.timestamp >= todayStart.getTime());
  const recent = fiveHours.filter(event => now - event.timestamp <= 3600000);
  const first = recent[0]?.timestamp;
  const last = recent.at(-1)?.timestamp;
  const durationMinutes = first != null && last > first ? (last - first) / 60000 : null;
  const generationDurationMinutes = recent.reduce((total, event) =>
    total + (Number(event.durationMs) > 0 ? Number(event.durationMs) / 60000 : 0), 0);
  const totalTokens = sum(valid);
  const source = valid.at(-1)?.source || null;
  const secondaryTotal = options.secondaryTotalTokens;
  const divergence = calculateDivergence(totalTokens, secondaryTotal);
  const contextTokens = options.contextTokens ?? null;
  const contextWindow = Number.isFinite(Number(options.contextWindow)) ? Number(options.contextWindow) : null;
  return {
    inputTokens: sum(today, "inputTokens"),
    outputTokens: sum(today, "outputTokens"),
    totalTokens,
    messages: today.length,
    rolling5hTokens: sum(fiveHours),
    rolling7dTokens: sum(sevenDays),
    burnRate: recent.length >= 2 && durationMinutes >= 1 ? sum(recent) / durationMinutes :
      recent.length === 1 && generationDurationMinutes >= 1 ? sum(recent) / generationDurationMinutes : null,
    generationRate: generationDurationMinutes > 0 ? recent.length / generationDurationMinutes : null,
    contextTokens,
    contextWindow,
    contextPressure: contextTokens != null && contextWindow ? (contextTokens / contextWindow) * 100 : null,
    source,
    confidence: confidenceFor(source, divergence),
    divergence,
    divergenceDetected: divergence != null && divergence > 0.25,
    estimatedExhaustion: null,
    lastActivityAt: valid.at(-1)?.timestamp || null
  };
}
