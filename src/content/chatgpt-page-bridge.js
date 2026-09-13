(() => {
  if (window.__AI_LIMIT_CHATGPT_PAGE_BRIDGE__) return;
  window.__AI_LIMIT_CHATGPT_PAGE_BRIDGE__ = true;
  const bundledTokenizer = globalThis.GPTTokenizer_o200k_base;
  if (bundledTokenizer?.encode) {
    window.AILimitO200kTokenizer = { encode: bundledTokenizer.encode };
  }

  const EVENT = "AI_LIMIT_CHATGPT_ACTIVITY";
  const generationPattern = /(?:\/backend-api\/f\/conversation|\/backend-api\/conversation|\/backend-api\/responses|\/conversation)/i;
  const usagePattern = /(?:usage|prompt_tokens|completion_tokens|input_tokens|output_tokens|total_tokens)/i;
  const seenMessages = new Set();
  const seenResponses = new Set();

  function emit(event) {
    window.postMessage({ source: "ai-limit-chatgpt", type: EVENT, event }, location.origin === "null" ? "*" : location.origin);
  }

  function localTokenEstimate(text) {
    const value = String(text || "");
    if (!value) return { count: 0, source: "rough-estimate", confidence: "low" };
    if (window.AILimitO200kTokenizer?.encode) {
      return { count: window.AILimitO200kTokenizer.encode(value).length, source: "local-o200k", confidence: "high" };
    }
    if (typeof Intl?.Segmenter === "function") {
      const segmenter = new Intl.Segmenter("en", { granularity: "word" });
      const count = [...segmenter.segment(value)].reduce((total, part) => {
        if (/^\s+$/.test(part.segment)) return total;
        return total + (/^[\p{L}\p{N}_]+$/u.test(part.segment) ? Math.max(1, Math.ceil(part.segment.length / 4)) : [...part.segment].length);
      }, 0);
      return { count: Math.max(1, count), source: "tokenizer-estimate", confidence: "medium" };
    }
    return { count: Math.max(1, Math.ceil(value.length / 4)), source: "rough-estimate", confidence: "low" };
  }

  function safeJson(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function findUsage(value) {
    if (!value || typeof value !== "object") return null;
    if (usagePattern.test(JSON.stringify(Object.keys(value)))) {
      const inputTokens = Number(value.input_tokens ?? value.prompt_tokens ?? value.promptTokens);
      const outputTokens = Number(value.output_tokens ?? value.completion_tokens ?? value.completionTokens);
      const totalTokens = Number(value.total_tokens ?? value.totalTokens);
      if ([inputTokens, outputTokens, totalTokens].some(Number.isFinite)) {
        return {
          inputTokens: Number.isFinite(inputTokens) ? inputTokens : null,
          outputTokens: Number.isFinite(outputTokens) ? outputTokens : null,
          totalTokens: Number.isFinite(totalTokens) ? totalTokens : null
        };
      }
    }
    for (const child of Object.values(value)) {
      const found = findUsage(child);
      if (found) return found;
    }
    return null;
  }

  function findText(value, parts = []) {
    if (typeof value === "string" && value.length < 200000) parts.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(child => findText(child, parts));
    return parts.join("");
  }

  function requestBodyText(body) {
    if (typeof body !== "string") return "";
    const parsed = safeJson(body);
    return parsed ? findText(parsed) : "";
  }

  function textHash(text) {
    let hash = 2166136261;
    for (const character of String(text || "")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function eventForRequest(url, body) {
    if (!generationPattern.test(url)) return;
    const text = requestBodyText(body);
    const id = `${url}:input-${textHash(text)}`;
    if (seenMessages.has(id)) return;
    seenMessages.add(id);
    const estimate = localTokenEstimate(text);
    emit({ kind: "input", generationId: id, eventId: id, model: null, tokenCount: estimate.count, source: estimate.source, confidence: estimate.confidence, usage: null });
    return id;
  }

  async function inspectResponse(url, response, responseId) {
    if (!generationPattern.test(url)) return response;
    try {
      const clone = response.clone();
      const body = await clone.text();
      const parsed = safeJson(body);
      const usage = parsed ? findUsage(parsed) : null;
      const text = parsed ? findText(parsed) : body;
      if (usage) {
        emit({ kind: "output", generationId: responseId, eventId: responseId, model: null, tokenCount: null, source: "provider-reported", confidence: "high", usage });
      } else if (!seenResponses.has(responseId)) {
        seenResponses.add(responseId);
        const estimate = localTokenEstimate(text);
        emit({ kind: "output", generationId: responseId, eventId: responseId, model: null, tokenCount: estimate.count, source: estimate.source, confidence: estimate.confidence, usage: null });
      }
    } catch {
      // Page response inspection is best effort and never affects the request.
    }
    return response;
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const generationId = eventForRequest(url, init?.body);
    const response = await originalFetch.apply(this, arguments);
    return inspectResponse(url, response, generationId || `${url}:${Date.now()}:${Math.random()}`);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.__aiLimitUrl = String(url || "");
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.__aiLimitGenerationId = eventForRequest(this.__aiLimitUrl || "", body);
    this.addEventListener("load", () => {
      if (this.responseType && this.responseType !== "text") return;
      inspectResponse(this.__aiLimitUrl || "", new Response(this.responseText), this.__aiLimitGenerationId || `${this.__aiLimitUrl}:${Date.now()}`);
    }, { once: true });
    return originalSend.apply(this, arguments);
  };
})();
