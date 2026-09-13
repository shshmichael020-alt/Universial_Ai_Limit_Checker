# AI Limit Project Guide

AI Limit is a privacy-first Chromium extension that presents AI usage information as a compact floating HUD. It is designed for Chrome and Brave and is currently a working prototype under active development.

## What The Project Does

AI Limit gives users one place to inspect two different kinds of information:

1. **Provider quota**: quota or usage information exposed by a provider API or by an explicit provider-visible settings page.
2. **Local activity**: activity measured in the browser, primarily through the local O200K tokenizer and the ChatGPT activity bridge.

These lanes are intentionally separate. Local tokens are not converted into official quota, and an unavailable quota is never replaced with a fabricated percentage.

## Product Surfaces

### Floating HUD

The HUD is injected into supported provider pages near the message composer. It supports:

- Compact Power Ring mode
- Expanded usage card
- Provider-aware header identity
- Official quota and local activity separation
- Local activity totals and rolling windows
- Dragging and manual repositioning
- Per-domain position persistence
- Viewport clamping
- Composer-aware automatic placement
- MutationObserver-based placement recovery

The Power Ring uses official percentage data when a valid percentage exists. When official quota is unavailable, it becomes a clearly labeled local activity indicator. It never displays local activity as provider quota.

### Popup

The popup provides a quick view of provider entries, primary percentage quota selection, source status, used/remaining metadata when available, and a link to the full dashboard.

### Dashboard

The dashboard provides:

- Provider overview cards
- History snapshots
- Local JSON and CSV export
- Theme and refresh controls
- Alert thresholds
- History retention settings
- Manual fallback values
- Demo mode
- Provider capability information

Manual and demo values are explicitly represented and are not presented as verified provider quota.

## Data Flow

```text
Provider page
  -> provider configuration
  -> visible detector and/or ChatGPT activity bridge
  -> runtime message
  -> service worker
  -> usage service and provider adapter
  -> source resolver
  -> local storage
  -> HUD, popup, or dashboard
```

The ChatGPT activity path is:

```text
MAIN-world page bridge
  -> numeric-only activity event
  -> isolated content script
  -> service worker
  -> activity ledger
  -> activity model
  -> HUD and stored activity summary
```

The bridge does not persist prompts or responses. It extracts numeric usage metadata when available and otherwise records labeled local estimates.

## Source Priority

When multiple observations describe the same limit, the project uses this priority:

```text
provider-api
  > provider-visible
  > estimated
  > cached
  > unavailable
```

A fresh valid observation can replace a cached observation. Manual and demo states remain protected. Cached values are explicitly marked cached, and estimates are explicitly marked estimated.

## Provider Support

### ChatGPT

- Provider-visible percentage detection on supported usage/settings surfaces
- Best-effort official adapter support
- Local O200K activity tracking
- Rolling five-hour and seven-day activity
- Message, input, output, total-token, last-generation, and burn-rate metrics
- Context remains unavailable unless a reliable measurement is supplied

### Claude

- Best-effort official adapter support
- Provider-visible usage detection on supported settings pages
- Unknown values remain unavailable when the page does not expose a trustworthy percentage

### Gemini

- Consumer Gemini quota is unavailable unless a verified consumer source exists
- Cloud Code Assist and Gemini CLI quota are not treated as consumer Gemini Chat quota
- Visible detection and local estimates remain separate

### GitHub Copilot Web

- Provider-visible detection is best-effort
- Manual values and labeled estimates are supported where appropriate
- No unsupported official API is claimed

Provider adapters are modular and must follow the shared provider interface. New providers should be added without mixing provider acquisition logic into UI code.

## Privacy Model

AI Limit is local-first:

- Prompts are not stored.
- Responses are not stored.
- Cookies are not stored.
- Passwords and credentials are not stored.
- Authentication and access tokens are not stored.
- Authorization headers are not persisted.
- Raw page content is not persisted.
- Activity records contain numeric aggregates, timestamps, model/source labels, confidence, and opaque event IDs.
- There is no external analytics service or project backend.

The extension still requests first-party authenticated pages where an adapter needs provider-visible account information, but the returned raw payload is not written to extension storage.

## Storage

Local storage may contain:

- Extension settings
- HUD positions
- Manual limits
- Demo settings
- Normalized provider usage snapshots
- Retention-limited history
- Numeric activity events and summaries
- Notification cooldown timestamps

History is retention-limited and does not contain conversation content.

## UI State Rules

The interface deliberately distinguishes:

- **Live**: fresh provider API observation
- **Detected**: fresh provider-visible observation
- **Estimated**: local estimate, clearly labeled
- **Cached**: previously usable data retained after a failed refresh
- **Manual**: user-entered fallback
- **Demo**: development sample data
- **Unavailable**: no trustworthy value is available

Unknown is a valid state. The UI must not turn unknown into `0%`, `100%`, zero credits, or a fabricated remaining value.

## Development Workflow

1. Load the project folder with `manifest.json` in Chrome or Brave using **Load unpacked**.
2. Use the popup and dashboard to inspect local state.
3. Test provider pages only with accounts and permissions appropriate for the environment.
4. Run the validator:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-extension.ps1
```

5. Open the fixture HTML files in Chrome or Brave and verify their `pre#result` output.
6. Check the service worker and content-script consoles for runtime errors during provider smoke tests.

## Test Coverage

The current browser fixture suite covers:

- O200K tokenizer behavior
- Activity model totals and rolling windows
- Activity ledger normalization and duplicate prevention
- ChatGPT data flow
- Burn-rate safeguards
- HUD placement, dragging, and viewport clamping
- HUD quota/activity state hierarchy
- Provider source parsing
- Source resolver cache recovery
- Primary percentage-limit selection
- Reconciliation comparability
- Gemini consumer quota separation
- Final Power Ring UI contracts

The current repository contains 14 fixtures and 92 assertions.

## Contribution Boundaries

Changes should preserve these project rules:

- Do not mix local activity into official quota.
- Do not invent private provider APIs.
- Do not fabricate percentages or token limits.
- Do not persist prompts, responses, cookies, credentials, or tokens.
- Keep provider adapters separate from UI.
- Keep O200K as the primary local tokenizer.
- Keep reconciliation conservative.
- Add focused fixtures for new behavior.
- Update README and architecture documentation when behavior changes.

## Current Limitations

This is not production-complete software. Provider interfaces may change without notice, official quota availability varies, context-token measurement is limited, and live browser smoke testing remains necessary for each supported provider.

## Roadmap

- More verified provider integrations
- Better provider-visible quota detection
- Reliable context measurement where providers expose it
- Broader automated browser coverage
- UX refinement
- Production hardening and release packaging
