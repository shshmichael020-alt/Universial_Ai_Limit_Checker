export const DEFAULT_SETTINGS = {
  settingsVersion: 2,
  hudEnabled: true,
  demoMode: false,
  theme: "auto",
  position: "auto",
  refreshMinutes: 5,
  alert75: true,
  alert90: true,
  alert95: true,
  alert100: true,
  historyDays: 30
};

export async function getState() {
  const state = await chrome.storage.local.get([
    "settings", "usage", "history", "manualLimits", "lastUpdated", "positions", "activityEvents", "activitySummary", "activitySummaries"
  ]);

  const storedSettings = state.settings || {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    ...(!storedSettings.settingsVersion ? { demoMode: false, settingsVersion: DEFAULT_SETTINGS.settingsVersion } : {})
  };

  return {
    settings,
    usage: state.usage || {},
    history: state.history || [],
    manualLimits: state.manualLimits || {},
    lastUpdated: state.lastUpdated || null,
    positions: state.positions || {},
    activityEvents: state.activityEvents || [],
    activitySummary: state.activitySummary || null,
    activitySummaries: state.activitySummaries || {}
  };
}
