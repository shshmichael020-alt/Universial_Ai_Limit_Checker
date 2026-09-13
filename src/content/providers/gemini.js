(() => {
  window.AILimitVisibleProviders = window.AILimitVisibleProviders || {};

  window.AILimitVisibleProviders.gemini = {
    detect() {
      // Gemini consumer limits vary by plan, model, feature, and time window.
      // Generic chat text is not a trustworthy usage source.
      return null;
    },
    estimate() {
      const candidates = [...document.querySelectorAll("main article, main [role='article'], [data-message-author-role], [data-message-id], [class*='message-content' i], [class*='response' i], [role='main'], main")];
      const specific = candidates.filter(element => element !== document.querySelector("main") && element !== document.querySelector("[role='main']"));
      const selected = specific.length ? specific : candidates;
      const leaves = selected.filter(element => !selected.some(parent => parent !== element && parent.contains(element)));
      const visibleTextLength = (leaves.length ? leaves : selected)
        .filter(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0)
        .reduce((total, element) => total + (element.textContent || "").length, 0);
      if (!visibleTextLength) return null;
      const used = Math.max(1, Math.ceil(visibleTextLength / 4));
      return {
        provider: "gemini",
        status: "estimated",
        source: "estimated",
        confidence: "low",
        updatedAt: Date.now(),
        limits: [{ id: "estimated-visible-context", name: "Estimated visible activity", used, limit: null, remaining: null, percentage: null, period: "visible-session", resetAt: null, model: null, source: "estimated", confidence: "low", estimated: true, sourceDetail: "Local token estimate from visible Gemini conversation text" }]
      };
    }
  };
})();
