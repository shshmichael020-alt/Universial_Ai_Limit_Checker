(() => {
  const config = window.AILimitProviderConfig?.getCurrent();
  if (!config || config.id === "chatgpt") return;

  const selectors = {
    claude: ["main article", "main [data-testid*='message' i]", "main [data-testid*='content' i]", "main [class*='message-content' i]", "main [class*='prose' i]", "main [class*='markdown' i]", "main [class*='response' i]", "[role='main']", "main"],
    gemini: ["main article", "main [role='article']", "[data-message-author-role]", "[data-message-id]", "[class*='message-content' i]", "[class*='response' i]", "[role='main']", "main"],
    copilot: ["main article", "main [data-testid*='message' i]"]
  };
  let previousLength = 0;
  let timer = null;

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

  function visibleTextLength() {
    const seen = new Set();
    const candidates = (selectors[config.id] || [])
      .flatMap(selector => [...document.querySelectorAll(selector)])
      .filter(element => {
        if (seen.has(element) || element.closest("#ai-limit-root")) return false;
        seen.add(element);
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const specific = candidates.filter(element => element !== document.querySelector("main") && element !== document.querySelector("[role='main']"));
    const selected = specific.length ? specific : candidates;
    const leaves = selected.filter(element => !selected.some(parent => parent !== element && parent.contains(element)));
    const messageNodes = leaves.length ? leaves : selected;
    return {
      textLength: messageNodes.reduce((total, element) => total + (element.textContent || "").trim().length, 0),
      messageCount: messageNodes.length
    };
  }

  function report() {
    const snapshot = visibleTextLength();
    const currentLength = snapshot.textLength;
    const delta = currentLength >= previousLength ? currentLength - previousLength : currentLength;
    previousLength = currentLength;
    if (!delta) return;
    const totalTokens = Math.max(1, estimateTokens(String(delta)));
    chrome.runtime.sendMessage({
      type: "PROVIDER_ACTIVITY_EVENT",
      event: {
        timestamp: Date.now(),
        provider: config.id,
        eventId: `${config.id}:${Date.now()}:${totalTokens}`,
        inputTokens: totalTokens,
        outputTokens: 0,
        totalTokens,
        messageCount: snapshot.messageCount,
        source: "rough-estimate",
        confidence: "low"
      }
    }).catch(() => {});
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(report, 500);
  }

  setTimeout(report, 1000);
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
