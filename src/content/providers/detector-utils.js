(() => {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function parsePercent(value) {
    const percentage = Number(String(value).replace("%", "").trim());
    return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100 ? percentage : null;
  }

  function limitFromPercentage(provider, name, percentage, source, period = "provider-visible", resetAt = null) {
    if (!Number.isFinite(percentage)) return null;
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      used: null,
      limit: null,
      remaining: null,
      percentage,
      period,
      resetAt,
      source,
      confidence: "high"
    };
  }

  function parseExplicitPercent(text, keywords) {
    const normalized = cleanText(text);
    const lowerText = normalized.toLowerCase();
    for (const keyword of keywords) {
      const index = lowerText.indexOf(keyword.toLowerCase());
      if (index < 0) continue;
      const context = normalized.slice(Math.max(0, index - 120), index + keyword.length + 120);
      const match = context.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
      const percentage = match ? parsePercent(match[1]) : null;
      if (Number.isFinite(percentage)) return percentage;
    }
    return null;
  }

  window.AILimitDetectorUtils = {
    cleanText,
    parsePercent,
    limitFromPercentage,
    parseExplicitPercent
  };
})();
