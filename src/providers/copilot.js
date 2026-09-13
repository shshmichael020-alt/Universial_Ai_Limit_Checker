import { ProviderAdapter } from "./provider-interface.js";

export class CopilotProvider extends ProviderAdapter {
  constructor() {
    super("copilot");
  }
}
