export function calculateUsage(used, limit) {
  used = Number(used);
  limit = Number(limit);

  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return { used: null, limit: null, remaining: null, percentage: null };
  }

  used = Math.max(0, used);
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, Math.max(0, (used / limit) * 100));

  return { used, limit, remaining, percentage };
}

export function usageColor(percent) {
  if (!Number.isFinite(percent)) return "#777983";
  if (percent >= 90) return "#ff3b30";
  if (percent >= 75) return "#ff9f1c";
  return "#25d366";
}
