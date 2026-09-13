(() => {
  window.AILimitVisibleProviders = window.AILimitVisibleProviders || {};

  const creditsSelector = "div.text-token-text-primary.text-sm";

  function isVisible(element) {
    if (!element || element.closest("#ai-limit-root")) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" &&
      rect.width > 0 && rect.height > 0;
  }

  function parseCreditsElement(element) {
    if (!isVisible(element)) return null;
    const text = element.textContent.replace(/\s+/g, " ").trim();
    const match = text.match(/^(\d+(?:\.\d+)?)\s+credits?\s+left$/i);
    const parent = element.parentElement;
    if (!match || !parent?.matches("div.flex.items-center.justify-between.gap-4")) return null;
    const addMore = [...parent.querySelectorAll("button")].find(button =>
      button.textContent.replace(/\s+/g, " ").trim().toLowerCase() === "add more"
    );
    if (!addMore) return null;
    const value = Number(match[1]);
    return {
      element,
      displayedValue: text,
      observation: {
        id: "credits",
        name: "Credits",
        used: null,
        limit: null,
        remaining: value,
        displayValue: text,
        percentage: null,
        period: null,
        resetAt: null,
        model: null,
        source: "provider-visible",
        confidence: "high"
      }
    };
  }

  function detectCredits() {
    return [...document.querySelectorAll(creditsSelector)]
      .map(parseCreditsElement)
      .find(Boolean) || null;
  }

  window.AILimitVisibleProviders.chatgpt = {
    detect() {
      console.debug("[AI-LIMIT][CHATGPT] DOM scan started", { url: location.href });
      const credits = detectCredits();
      if (!credits) {
        console.debug("[AI-LIMIT][CHATGPT] No provider-visible usage information found");
        return null;
      }
      console.debug("[AI-LIMIT][CHATGPT] candidate found", {
        element: credits.element,
        displayedValue: credits.displayedValue
      });
      console.debug("[AI-LIMIT][CHATGPT] parsed observation", credits.observation);
      const result = {
        provider: "chatgpt",
        status: "detected",
        updatedAt: Date.now(),
        source: "provider-visible",
        confidence: "high",
        limits: [credits.observation]
      };
      console.debug("[AI-LIMIT][CHATGPT] normalized observation", result);
      return result;
    }
  };

  window.__AI_LIMIT_CHATGPT_DEBUG = async () => {
    const credits = detectCredits();
    const detection = window.AILimitVisibleProviders.chatgpt.detect();
    const response = await new Promise(resolve => chrome.runtime.sendMessage({ type: "GET_STATE" }, resolve));
    const apiResponse = await new Promise(resolve => chrome.runtime.sendMessage({ type: "GET_CHATGPT_API_DIAGNOSTICS" }, resolve));
    const result = {
      url: location.href,
      provider: "chatgpt",
      detectedElement: credits?.element || null,
      extractedCreditsValue: credits?.displayedValue || null,
      normalized: detection,
      reportSent: Boolean(window.__AI_LIMIT_CHATGPT_LAST_REPORT_SENT),
      api: apiResponse?.diagnostic || null,
      stored: response?.state?.usage?.chatgpt || null
    };
    console.debug("[AI-LIMIT][CHATGPT] debug result", result);
    return result;
  };
})();
