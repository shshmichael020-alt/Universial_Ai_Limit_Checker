(() => {
  const config = window.AILimitProviderConfig?.getCurrent();
  const detector = config && window.AILimitVisibleProviders?.[config.id];
  if (!detector) return;

  let timer = null;
  let lastSignature = "";
  if (config.id === "chatgpt") window.__AI_LIMIT_CHATGPT_LAST_REPORT_SENT = false;

  function report() {
    if (config.id === "chatgpt") console.debug("[AI-LIMIT][CHATGPT] DOM scan started");
    const usage = detector.detect();
    if (!usage?.limits?.length) {
      const estimate = config.id === "chatgpt" ? null : detector.estimate?.();
      if (estimate?.limits?.length) {
        const estimateSignature = JSON.stringify({ provider: estimate.provider, limits: estimate.limits });
        if (estimateSignature !== lastSignature) {
          lastSignature = estimateSignature;
          chrome.runtime.sendMessage({ type: "REPORT_VISIBLE_USAGE", usage: estimate }).catch(() => {});
        }
        return;
      }
      if (config.id === "chatgpt" && lastSignature !== "unavailable") {
        lastSignature = "unavailable";
        chrome.runtime.sendMessage({
          type: "REPORT_VISIBLE_USAGE",
          usage: { provider: "chatgpt", status: "unavailable", source: "provider-visible", limits: [] }
        }).then(() => {
          window.__AI_LIMIT_CHATGPT_LAST_REPORT_SENT = true;
          console.debug("[AI-LIMIT][CHATGPT] report sent");
        })
          .catch(() => {});
      }
      return;
    }
    const signature = JSON.stringify({
      provider: usage.provider,
      limits: usage.limits
    });
    if (signature === lastSignature) return;
    lastSignature = signature;
    chrome.runtime.sendMessage({ type: "REPORT_VISIBLE_USAGE", usage })
      .then(() => {
        if (config.id === "chatgpt") {
          window.__AI_LIMIT_CHATGPT_LAST_REPORT_SENT = true;
          console.debug("[AI-LIMIT][CHATGPT] report sent");
        }
      })
      .catch(() => {});
  }

  function scheduleReport() {
    clearTimeout(timer);
    timer = setTimeout(report, 350);
  }

  report();
  const observer = new MutationObserver(scheduleReport);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();