# AI Limit

Working Chromium browser-extension prototype for a privacy-first AI usage HUD.

## Status

WORKING PROJECT / ACTIVE DEVELOPMENT. The core HUD and local O200K activity tracking work, provider adapters exist, and official quota availability varies by provider. Some integrations are best-effort or under development; this project is not production-ready, and provider changes can break undocumented integrations.

## Supported websites
- ChatGPT
- Claude
- Gemini
- GitHub Copilot Web

## Current data sources

- ChatGPT: detects an explicit percentage only on provider-visible settings, usage, or analytics pages.
- Claude: detects an explicit percentage only on the signed-in `/settings/usage` page.
- GitHub Copilot: detects an explicit percentage only on provider-visible Copilot/settings pages when the page labels it as usage, credits, or premium usage.
- Gemini: consumer quota unavailable. Cloud Code Assist and Gemini CLI quotas are deliberately not treated as Gemini consumer Chat usage; visible detection and local estimates remain separate.

## Architecture

AI Limit keeps two independent lanes: **Provider Quota** (official or provider-visible quota data) and **Local Activity** (numeric activity measured in the browser with O200K). Reconciliation is only reported when units and windows genuinely match. Local activity never becomes official quota, and unknown values remain unavailable.

For the full product overview, runtime data flow, provider behavior, storage model, privacy rules, UI states, testing workflow, and contribution boundaries, see [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md).

## Supported Providers

- **ChatGPT:** official quota is best-effort through the permitted adapter; provider-visible percentage detection and local O200K activity are supported. Estimates are labeled.
- **Claude:** official quota is best-effort; provider-visible percentage detection is supported, with local activity/estimates where available.
- **Gemini:** verified consumer official quota is unavailable; generic visible consumer quota is not invented, and local estimates are labeled.
- **GitHub Copilot Web:** provider-visible detection is best-effort; manual values and local estimates are supported where applicable, but no unsupported official API is claimed.

Detected values contain provider-visible percentage data. Absolute used, limit, remaining, and reset values remain unavailable unless the provider page explicitly exposes them. No private API, credentials, cookies, or conversation text are used.

## Structure

```text
AI-Limit-Universal-HUD/
├── manifest.json
├── assets/icons/
├── docs/
├── scripts/
├── tests/
src/
├── background/        MV3 service worker and alarms
├── content/           provider detection, composer placement, and HUD
├── dashboard/         full settings, history, and exports UI
├── popup/             toolbar popup UI
├── providers/         normalized provider adapters and capabilities
├── services/          usage refresh and notifications
└── utils/             storage, calculations, and intelligence
```

The source is organized by extension runtime surface and responsibility, matching the practical layout used by mature MV3 projects. Provider logic stays separate from UI, while shared state flows through local storage.

## Reliability decisions

- A refresh with no usable provider data preserves the last usable value as `cached`; it never writes zero.
- Failed or unavailable refreshes do not create misleading history samples.
- History is local, retention-limited, filterable, and exportable as JSON or CSV.
- Rate, trend, and exhaustion projections are derived from recorded snapshots and labeled as estimates.
- Provider adapters expose capability metadata and remain replaceable; private endpoints are not required.

## Important
The extension is designed around reliable, permitted usage sources. It does not ask for passwords, collect session cookies, or claim fake live quotas.

Demo mode is provided so the UI can be developed before provider-specific live integrations are implemented.

## Installation
1. Open `chrome://extensions` (or Brave's extensions page).
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the folder containing `manifest.json`.

## Privacy

Prompts, responses, cookies, credentials, and auth/access tokens are not stored. Activity remains local, with no external analytics or backend.

## Known Limitations

Provider interfaces can change without notice. Consumer quota APIs are not uniformly available, context-token measurement is unavailable when no reliable provider measurement exists, and browser smoke testing is still required for each provider.

## Roadmap

- More verified provider integrations
- Improved quota detection
- Better context measurement
- More automated and browser testing
- UX refinement and production hardening

## Validation

Run `powershell -ExecutionPolicy Bypass -File .\scripts\validate-extension.ps1` to validate the manifest, entry paths, and stale path references.

The repository includes browser fixtures for the O200K tokenizer, activity ledger/model, ChatGPT data flow, HUD interaction and positioning, source resolution and cache recovery, reconciliation, provider selection, Gemini separation, and the final Power Ring UI. Open the fixture HTML files in Chrome or Brave and verify the `pre#result` output; the current suite contains 14 fixtures and 92 assertions.
