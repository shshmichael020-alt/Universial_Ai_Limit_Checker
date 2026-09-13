(() => {
  window.AILimitVisibleProviders = window.AILimitVisibleProviders || {};
  const utils = window.AILimitDetectorUtils;

  window.AILimitVisibleProviders.claude = {
    detect() {
      if (!location.pathname.includes("/settings/usage")) return null;
      const text = utils.cleanText(document.body?.innerText);
      const percentage = utils.parseExplicitPercent(text, ["usage", "limit", "session", "weekly"]);
      const limit = utils.limitFromPercentage("claude", "Visible Claude usage", percentage, "provider-visible");
      return limit ? { provider: "claude", status: "detected", updatedAt: Date.now(), limits: [limit] } : null;
    },
    estimate() {
      const visibleTextLength = [...document.querySelectorAll("main article, main [data-testid*='message' i]")]
        .filter(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0)
        .reduce((total, element) => total + (element.textContent || "").length, 0);
      if (!visibleTextLength) return null;
      return {
        provider: "claude",
        status: "estimated",
        source: "estimated",
        confidence: "low",
        updatedAt: Date.now(),
        limits: [{ id: "estimated-visible-context", name: "Estimated visible context", used: visibleTextLength, limit: null, remaining: null, percentage: null, period: "visible-session", resetAt: null, model: null, source: "estimated", confidence: "low", estimated: true, sourceDetail: "Local aggregate of visible message text length" }]
      };
    }
  };
})();
