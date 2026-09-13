const SOURCE_PRIORITY = {
  "provider-api": 4,
  "provider-visible": 3,
  estimated: 2,
  cached: 1
};

export function selectPrimaryLimit(entry) {
  return (Array.isArray(entry?.limits) ? entry.limits : [])
    .filter(limit => limit?.percentage != null && Number.isFinite(Number(limit.percentage)) &&
      Number(limit.percentage) >= 0 && Number(limit.percentage) <= 100)
    .sort((left, right) => (SOURCE_PRIORITY[right.source] || 0) - (SOURCE_PRIORITY[left.source] || 0))[0] || null;
}