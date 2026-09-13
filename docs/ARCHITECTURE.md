# Architecture

## Runtime flow

```text
Provider page
  -> content/provider-config.js
  -> content/content.js (HUD and placement)
  -> runtime message
  -> background/service-worker.js
  -> services/usage-service.js
  -> providers/* adapters
  -> services/source-resolver.js (provider-api > provider-visible > estimated > cached)
  -> utils/storage.js
  -> popup or dashboard
```

## Folder ownership

- `src/background`: Manifest V3 lifecycle, alarms, refresh orchestration, and notifications.
- `src/content`: page-local provider detection, composer selectors, HUD rendering, drag behavior, and placement.
- `src/providers`: one normalized adapter per provider. These adapters must never own UI code.
- `src/services`: refresh, notification, and source-priority workflows.
- `src/utils`: reusable calculations, local storage access, and estimate logic.
- `src/popup`: compact toolbar view.
- `src/dashboard`: options page, settings, history, exports, and provider comparison.

## Data contract

Every provider returns:

```js
{
  provider: "chatgpt",
  status: "live | detected | manual | demo | cached | unavailable | error",
  limits: [{
    id: "provider-window",
    name: "Messages",
    used: null,
    limit: null,
    remaining: null,
    percentage: null,
    period: "daily",
    resetAt: null,
    model: null,
    source: "provider-api | provider-visible | estimated | cached | manual | demo",
    confidence: "high | medium | low",
    estimated: false,
    sourceDetail: "provider-specific source description"
  }]
}
```

A refresh that has no usable value preserves the previous usable entry as `cached`. It does not write zero and does not add a false history sample.

## Provider source acquisition

Provider adapters own their acquisition and parsing. They may use a read-only authenticated first-party endpoint, then the provider-visible detector, then a numeric local estimate. `source-resolver.js` merges limits by id and never replaces a higher-priority provider API limit with lower-priority DOM or estimate data. API responses, headers, credentials, cookies, and conversation text are not stored or logged.

 Current API sources are intentionally best-effort and undocumented: ChatGPT `GET /backend-api/wham/usage` and Claude organization discovery followed by its usage endpoint. Gemini Cloud Code Assist and Gemini CLI quota are intentionally excluded because they are not verified consumer Chat quota. Authentication failure or response-shape changes fall back cleanly.

## ChatGPT activity ledger

ChatGPT generation traffic is observed by the document-start MAIN-world bridge and crossed into the isolated content script as numeric-only events. Provider usage metadata is preferred; otherwise a local tokenizer estimate is emitted, with character/4 only as a last resort. The service worker stores only timestamped numeric aggregates, model, source, confidence, and an opaque event id, pruned after seven days. Prompts and responses are never stored or sent outside the page.

The local activity lane uses the bundled MIT-licensed `gpt-tokenizer` O200K browser bundle first. `Intl.Segmenter` is labeled `tokenizer-estimate` and character/4 is labeled `rough-estimate`; neither is provider quota. `activity-model.js` calculates rolling windows, burn rate, context pressure, confidence, and divergence without averaging measurements. `reconciliation.js` keeps official quota and activity separate and reports `not-comparable` unless both values are comparable token measurements.

## Provider-visible detection

The content script loads isolated detectors from `src/content/providers/`. They only inspect the signed-in page's visible text on explicit usage/settings/analytics routes. A detector must find a percentage next to a provider-usage keyword before reporting `detected` data. Generic chat text is ignored. Gemini currently reports no consumer usage because public plan limits do not provide a reliable per-account percentage.

## Adding a provider

1. Add an adapter in `src/providers/`.
2. Register its capability metadata in `src/services/usage-service.js`.
3. Add host matching and composer selectors in `src/content/provider-config.js`.
4. Add the host permission and content-script match in `manifest.json`.
5. Add the provider to the popup/dashboard display lists.
6. Verify unavailable, cached, manual, and reset-window behavior before adding any live source.
