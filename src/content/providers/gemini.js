(() => {
  window.AILimitVisibleProviders = window.AILimitVisibleProviders || {};

  window.AILimitVisibleProviders.gemini = {
    detect() {
      // Gemini consumer limits vary by plan, model, feature, and time window.
      // Generic chat text is not a trustworthy usage source.
      return null;
    },
    estimate() {
      const visibleTextLength = [...document.querySelectorAll("main article, main [role='article']")]
        .filter(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0)
        .reduce((total, element) => total + (element.textContent || "").length, 0);
      if (!visibleTextLength) return null;
      return {
        provider: "gemini",
        status: "estimated",
        source: "estimated",
        confidence: "low",
        updatedAt: Date.now(),
        limits: [{ id: "estimated-visible-context", name: "Estimated visible context", used: visibleTextLength, limit: null, remaining: null, percentage: null, period: "visible-session", resetAt: null, model: null, source: "estimated", confidence: "low", estimated: true, sourceDetail: "Local aggregate of visible message text length" }]
      };
    }
  };
})();
