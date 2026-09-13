# Test contract

AI Limit currently has no dependency-heavy test runner. Before packaging or loading an unpacked build, verify:

- `manifest.json` parses and every referenced asset exists.
- The service worker imports resolve from `src/background`.
- A refresh with unavailable provider data preserves usable previous data as `cached`.
- Demo mode is visibly labeled and disabling it never creates fake percentages.
- Manual limits calculate remaining and percentage correctly.
- History retention removes samples older than the configured window.
- JSON and CSV exports contain only local snapshots.
- The content script creates one `ai-limit-root`, survives composer mutations, and restores per-domain positions.

The repository validation script covers the static manifest and path checks. Browser smoke checks should be run by loading the unpacked extension in Chrome or Brave.

Focused fixtures also cover cache recovery, primary percentage-limit selection, reconciliation comparability, and Gemini consumer quota separation. Each fixture writes its assertions to a `pre#result` element for browser-run verification.
