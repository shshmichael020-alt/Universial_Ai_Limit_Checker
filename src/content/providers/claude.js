(() => {
  window.AILimitVisibleProviders = window.AILimitVisibleProviders || {};
  const utils = window.AILimitDetectorUtils;

  function estimateTokens(text) {
    const tokenizer = globalThis.GPTTokenizer_o200k_base;
    if (tokenizer?.countTokens) {
      try { return tokenizer.countTokens(text); } catch {}
    }
    if (tokenizer?.encode) {
      try { return tokenizer.encode(text).length; } catch {}
    }
    return Math.ceil(text.length / 4);
  }

  function messageText() {
    const selectors = [
      "main article",
      "main [data-testid*='message' i]",
      "main [data-testid*='content' i]",
      "main [class*='message-content' i]",
      "main [class*='prose' i]",
      "main [class*='markdown' i]",
      "main [class*='response' i]",
      "[role='main']",
      "main"
    ];
    const seen = new Set();
    const candidates = selectors.flatMap(selector => [...document.querySelectorAll(selector)])
      .filter(element => {
        if (seen.has(element) || element.closest("#ai-limit-root")) return false;
        seen.add(element);
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const specific = candidates.filter(element => element !== document.querySelector("main") && element !== document.querySelector("[role='main']"));
    const selected = specific.length ? specific : candidates;
    const leaves = selected.filter(element => !selected.some(parent => parent !== element && parent.contains(element)));
    const nodes = leaves.length ? leaves : selected;
    return nodes.map(element => element.textContent || "").join("\n").trim();
  }

  function parseVisibleReset(text) {
    const match = text.match(/until\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return null;
    const reset = new Date();
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    reset.setHours(hour, Number(match[2] || 0), 0, 0);
    if (reset.getTime() <= Date.now()) reset.setDate(reset.getDate() + 1);
    return reset.getTime();
  }

  window.AILimitVisibleProviders.claude = {
    detect() {
      const text = utils.cleanText(document.body?.innerText || document.documentElement?.textContent);
      if (/out\s+of\s+(?:free\s+)?messages?/i.test(text)) {
        const resetAt = parseVisibleReset(text);
        return {
          provider: "claude",
          status: "detected",
          source: "provider-visible",
          confidence: "high",
          updatedAt: Date.now(),
          limits: [{
            id: "claude-free-90k",
            name: "Claude Free plan · 90K tokens",
            used: 90000,
            limit: 90000,
            remaining: 0,
            percentage: 100,
            period: "rolling-5h",
            resetAt,
            model: null,
            source: "provider-visible",
            confidence: "high",
            estimated: false,
            tokenEstimated: true,
            sourceDetail: "Claude visible exhausted-limit message"
          }]
        };
      }
      if (!location.pathname.includes("/settings/usage")) return null;
      const percentage = utils.parseExplicitPercent(text, ["usage", "limit", "session", "weekly"]);
      const limit = utils.limitFromPercentage("claude", "Visible Claude usage", percentage, "provider-visible");
      return limit ? { provider: "claude", status: "detected", updatedAt: Date.now(), limits: [limit] } : null;
    },
    estimate() {
      const text = messageText();
      if (!text) return null;
      const used = Math.max(1, estimateTokens(text));
      const limit = 90000;
      return {
        provider: "claude",
        status: "estimated",
        source: "estimated",
        confidence: "low",
        updatedAt: Date.now(),
        limits: [{ id: "claude-free-90k", name: "Claude Free plan · 90K tokens", used, limit, remaining: Math.max(0, limit - used), percentage: Math.min(100, (used / limit) * 100), period: "rolling-session", resetAt: null, model: null, source: "estimated", confidence: "low", estimated: true, sourceDetail: "Local token estimate against the Claude Free plan reference limit" }]
      };
    }
  };
})();
