# Openverse Sounds

A compact dark, client-only audio plugin for LottieFiles Creator: search, preview, save sounds and add them to your scene. Freesound is selected by default.

## Run locally

Use Node.js 22.18+ or 24+ and npm.

```sh
npm install
npm run dev:ui -- --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/` for a standalone preview. In Creator, open Plugins, click **+**, choose **Develop** and enter `http://127.0.0.1:5173`. The server binds to loopback. `npm run dev` retains the template HTTPS/mkcert workflow; `dev:ui` avoids certificate installation.

## Scope

- Search all fields, title, creator or tags; source picker and sound ideas.
- Basic usage, duration, license and Creator-compatible format filters; relevance/index-date sort and load more.
- Waveform rows and one persistent preview player with seek, volume, mute and loop.
- Compact details, original-source/license links and attribution.
- Saved sounds through Creator clientStorage, backed by browser-local IndexedDB. Standalone favorites are session-only.
- Native Add with available file, playhead/start placement and optional scene extension. Trim, volume and fades are edited in Creator.

Reports, saved searches, JSON import/export, collections, advanced API tools and insertion editing controls have been removed from the interface. Existing legacy saved-search records are retained in storage for compatibility.

## Runtime

Anonymous requests and previews run in React without keys, auth or a backend. A custom fetch client handles caching, deduplication, timeouts and throttling; TanStack Query is not used.

The sandbox bridge performs native audio import, attribution, storage and public link opening. Creator downloads the audio URL. MP3/WAV/M4A/FLAC/OGG are supported up to 20 MB; search requests are limited to these formats by default. Providers may block access or require accounts for originals. Clipboard fallback supplies selectable text.

Native Add requires the supplied Creator audio API branch at revision `d47ed7a45`. Its unmodified public declarations are pinned in `vendor/creator-api-types` until published. Older hosts retain discovery. Keep the plugin manifest ID stable. Native import/configuration can require multiple Undo steps because the API has no history transaction.

## Verification and build

```sh
npm test
npm run lint
npm run build
```

Production output: `dist/ui.html`, `dist/plugin.js` and `dist/manifest.json`. Build, lint and 21 tests passed. Live local Creator verification covers supported-format search, home navigation, select/focus styling, preview, simplified import, native playback, attribution and saved-sound restoration.

[Watch the updated simplified flow](docs/videos/openverse-simplified-flow.mp4) (silent). [View the plugin](docs/screenshots/creator-simplified-plugin.jpg) or [the smaller Add dialog](docs/screenshots/creator-simple-add.jpg). The earlier [audio API walkthrough](docs/videos/openverse-creator-audio-flow.mp4) shows the previous expanded interface and native editing checks.

Local Creator runs at `http://127.0.0.1:3000/` using `/private/tmp/openverse-creator-audio-verify.mts` to expose its development loader. That temporary config changes no audio implementation and is unnecessary when the loader is already enabled. The supplied Creator worktree remains unchanged.

`PRD.MD` records current product scope. `WORKLOG.MD` records decisions, changes and verification history.
