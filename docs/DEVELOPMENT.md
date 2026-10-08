# Development notes

For installation and local setup, see the [README](../README.md). For contribution expectations, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Architecture

The plugin has two parts: a React UI running in an iframe, and a Creator sandbox bridge. Openverse discovery and previews run in the UI; scene changes and persistent storage go through the bridge. There is no plugin backend, account setup, or API key.

| Path | Responsibility |
| --- | --- |
| `src/app.tsx`, `src/components/` | Search, filters, preview, sound details, and Add interface |
| `src/lib/api.ts`, `src/lib/model.ts` | Openverse requests, response validation, search parameters, and format policy |
| `src/lib/use-player.ts` | Audio preview lifecycle |
| `src/lib/creator.ts` | UI-to-sandbox messages and host state |
| `src/lib/use-library.ts` | Saved-sound state |
| `plugin/plugin.ts` | Opens the 400 × 640 UI and registers message handling |
| `plugin/runtime.ts` | Native audio import, scene context, attribution, storage, and external links |
| `shared/creator.ts` | Bridge types, validation, timing, and provenance limits |
| `plugin/manifest.json` | Plugin identity, version, and entry points |
| `tests/` | Search/model and sandbox-bridge tests |

The project uses the official `@lottiefiles/creator-api-types` npm package, pinned to `1.2.0`. Scene insertion requires a Creator host with audio support. Older hosts retain discovery without Add.

## Requests, storage, and attribution

- A typed fetch client provides a five-minute memory cache, request deduplication, timeouts, and rate-limit cooldowns. There is no background catalog crawl.
- Saved sounds use `creator.clientStorage`, which is browser-local and scoped by user and plugin ID. Standalone favorites stay in memory. Keep legacy saved-library fields compatible even though saved searches are not exposed in the UI.
- On import, attribution and source/license metadata are stored on the audio layer. The plugin reads that metadata when the layer is selected; it does not identify a sound from its audio content.
- Search and import validation allow MP3, WAV, M4A, FLAC, and OGG, with a 20 MB import limit. Provider access rules, browser cross-origin rules, and codec support can still make a file unavailable.
- Imports are serialized and validate the active scene and frame rate while downloading. Failure cleanup preserves existing shared assets. Native import/configuration can occupy multiple Undo steps because the public API has no history transaction.

## Development and verification

`npm run dev:ui -- --port 5173 --strictPort` uses loopback HTTP. `npm run dev` retains the starter template's HTTPS/mkcert workflow.

Run `npm test`, `npm run lint`, and `npm run build` before submitting code changes. For changes that affect integration, use production [Creator](https://creator.lottiefiles.com/) and its Develop loader; no Creator checkout or host override is required.

Check search and format filters, home navigation, preview playback/seeking, Add at the playhead, optional scene extension, scene playback, saved-sound restoration after reload, and selected-layer attribution. Provider availability and anonymous request limits can affect live checks.

## Release artifacts

`npm run build` emits `dist/manifest.json`, `dist/plugin.js`, and `dist/ui.html`. A marketplace ZIP places those files at its root and includes dependency license notices. Future distributions should also include the repository's `LICENSE`.

Keep the published manifest ID stable. Use a new semantic version for a new bundle. The preserved `releases/creator-plugin-openverse-sfx-1.0.0.zip` is the exact approved upload; do not replace it with different bytes under the same version. Its hash and listing notes are recorded in [marketplace notes](marketplace/LISTING.MD).
