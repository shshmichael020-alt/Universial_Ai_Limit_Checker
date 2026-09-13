(() => {
  const config = window.AILimitProviderConfig?.getCurrent();
  if (config?.id !== "chatgpt") return;

  function report(event) {
    const usage = event.usage;
    const inputTokens = usage?.inputTokens ?? (event.kind === "input" ? event.tokenCount : null);
    const outputTokens = usage?.outputTokens ?? (event.kind === "output" ? event.tokenCount : null);
    const totalTokens = usage?.totalTokens ?? ((inputTokens || 0) + (outputTokens || 0));
    if (!totalTokens && inputTokens == null && outputTokens == null) return;
    chrome.runtime.sendMessage({
      type: "CHATGPT_ACTIVITY_EVENT",
      event: {
        timestamp: Date.now(),
        provider: "chatgpt",
        eventId: `${event.kind}:${event.generationId || event.eventId}`,
        model: event.model || null,
        inputTokens,
        outputTokens,
        totalTokens,
        durationMs: event.durationMs == null || Number(event.durationMs) <= 0 ? null : Number(event.durationMs),
        source: usage ? "provider-reported" : event.source || "rough-estimate",
        confidence: usage ? "high" : event.confidence || "low"
      }
    }).catch(() => {});
  }

  window.addEventListener("message", message => {
    if (message.source !== window || message.origin !== location.origin) return;
    if (message.data?.source !== "ai-limit-chatgpt" || message.data.type !== "AI_LIMIT_CHATGPT_ACTIVITY") return;
    report(message.data.event || {});
  });
})();
