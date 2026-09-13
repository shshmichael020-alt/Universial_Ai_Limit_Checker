(() => {
  window.AILimitVisibleProviders = window.AILimitVisibleProviders || {};
  const utils = window.AILimitDetectorUtils;

  window.AILimitVisibleProviders.copilot = {
    detect() {
      const path = location.pathname.toLowerCase();
      if (!path.includes("copilot") && !path.includes("settings")) return null;
      const text = utils.cleanText(document.body?.innerText);
      const percentage = utils.parseExplicitPercent(text, ["copilot", "premium", "usage", "credits"]);
      const limit = utils.limitFromPercentage("copilot", "Visible Copilot usage", percentage, "provider-visible");
      return limit ? { provider: "copilot", status: "detected", updatedAt: Date.now(), limits: [limit] } : null;
    }
  };
})();
