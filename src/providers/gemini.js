import { ProviderAdapter } from "./provider-interface.js";

export class GeminiProvider extends ProviderAdapter {
  constructor() {
    super("gemini");
  }

  async getUsage() {
    return { provider: this.provider, status: "unavailable", source: "unavailable", limits: [], error: "Verified Gemini consumer quota unavailable" };
  }
}
