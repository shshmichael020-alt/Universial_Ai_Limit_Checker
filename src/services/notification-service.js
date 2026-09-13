export async function notifyIfNeeded(provider, percentage, settings, limit = {}) {
  if (!Number.isFinite(percentage)) return;

  const thresholds = [
    [100, settings.alert100],
    [95, settings.alert95],
    [90, settings.alert90],
    [75, settings.alert75]
  ];

  const match = thresholds.find(([value, enabled]) =>
    enabled && percentage >= value
  );

  if (!match) return;

  const windowKey = limit.resetAt || limit.period || "unknown-window";
  const key = `alert:${provider}:${match[0]}:${windowKey}`;
  const stored = await chrome.storage.local.get(key);
  const lastAlert = Number(stored[key] || 0);
  if (Date.now() - lastAlert < 12 * 60 * 60 * 1000) return;

  await chrome.storage.local.set({ [key]: Date.now() });
  await chrome.notifications.create(`ai-limit-${provider}-${match[0]}`, {
    type: "basic",
    iconUrl: "assets/icons/icon128.png",
    title: `${provider} usage: ${Math.round(percentage)}%`,
    message: `You have reached the ${match[0]}% usage threshold.`
  });
}
