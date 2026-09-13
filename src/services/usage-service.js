import { getState } from "../utils/storage.js";
import { calculateUsage } from "../utils/calculations.js";
import { ChatGPTProvider } from "../providers/chatgpt.js";
import { ClaudeProvider } from "../providers/claude.js";
import { GeminiProvider } from "../providers/gemini.js";
import { CopilotProvider } from "../providers/copilot.js";

const demoUsage = {
  chatgpt: 72,
  claude: 41,
  gemini: 63,
  copilot: 35
};

const providers = Object.keys(demoUsage);
const adapters = {
  chatgpt: new ChatGPTProvider(),
  claude: new ClaudeProvider(),
  gemini: new GeminiProvider(),
  copilot: new CopilotProvider()
};

export const PROVIDER_CAPABILITIES = {
  chatgpt: { name: "ChatGPT", host: "chatgpt.com", live: true, notes: "Read-only first-party usage endpoint with DOM fallback" },
  claude: { name: "Claude", host: "claude.ai", live: true, notes: "Read-only first-party usage endpoint with DOM fallback" },
  gemini: { name: "Gemini", host: "gemini.google.com", live: false, notes: "Consumer quota unavailable; visible detection and local estimates only" },
  copilot: { name: "Copilot", host: "github.com", live: false, notes: "Manual or permitted source required" }
};

function normalize(provider, used, status, name = "Primary limit") {
  const usage = calculateUsage(used, 100);
  return {
    provider,
    status,
    updatedAt: Date.now(),
    limits: [{ ...usage, name, period: "manual", resetAt: null, source: status, confidence: "high", estimated: false }]
  };
}

export async function refreshUsage() {
  const state = await getState();
  const usage = {};

  for (const provider of providers) {
    const manual = state.manualLimits?.[provider];
    if (manual && Number.isFinite(Number(manual.used)) && Number.isFinite(Number(manual.limit))) {
      const calculated = calculateUsage(manual.used, manual.limit);
      usage[provider] = {
        provider,
        status: "manual",
        updatedAt: Date.now(),
        limits: [{ ...calculated, name: manual.name || "Manual limit", period: manual.period || "custom", resetAt: manual.resetAt || null, source: "manual", confidence: "high", estimated: false }]
      };
      continue;
    }
    if (state.settings.demoMode) {
      usage[provider] = normalize(provider, demoUsage[provider], "demo");
      continue;
    }
    try {
      usage[provider] = await adapters[provider].getUsage({ provider, capabilities: PROVIDER_CAPABILITIES[provider] });
    } catch (error) {
      usage[provider] = { provider, status: "error", limits: [], error: error?.message || "Provider refresh failed" };
    }
  }

  return usage;
}
