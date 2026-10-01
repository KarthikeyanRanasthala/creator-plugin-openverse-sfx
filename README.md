# Openverse Sounds

A dark, client-only audio explorer for LottieFiles Creator. Starts with Freesound and leaves category filtering unset, because many sound effects have incomplete category metadata.

## Run locally

Use Node.js 22.18+ or 24+ and npm.

```sh
npm install
npm run dev:ui -- --port 5173 --strictPort
```

Open http://127.0.0.1:5173/ for the standalone preview. In https://creator.lottiefiles.com/, open Plugins, click the **+**, choose **Develop**, and enter `http://127.0.0.1:5173`. This route was verified in Creator. The server binds only to loopback.

`npm run dev` retains the template's HTTPS/mkcert workflow for environments with local certificate trust already configured. `dev:ui` avoids certificate installation.

## Features

- General, title, creator, tag, and combined-field search; sound-oriented starting queries.
- Every audio search parameter from the supplied OpenAPI spec, including licenses, usage, categories, duration, formats, source inclusion/exclusion, content flags, experimental ranking and collections.
- Waveform rows and one persistent preview player with seek, volume, mute, and loop.
- Details, attribution, alternate files, artwork size/compression, related sounds, provider counts, and explicit reports.
- Session-only saved sounds, saved searches, and listening history; JSON export and file/paste import.
- Cached and deduplicated anonymous requests, bounded pagination, validation errors, timeouts, and rate-limit cooldowns.

## Runtime boundaries

All requests and playback run in the React UI. There are no API keys, auth headers, server services, or persistent browser storage. `plugin/plugin.ts` only opens a 400 × 640 panel and contains a future audio-insertion placeholder; it builds to the placeholder `plugin.js`.

Creator currently uses a script-only iframe. Search and playback work there. External links/downloads offer selectable URLs, clipboard actions offer selectable text, and export offers selectable JSON. Standalone mode opens links normally and attempts eligible downloads through CORS-enabled fetch-to-blob. Some original files require a provider account. Saved items disappear on close/reload unless exported. Development reloads also reset the session.

Anonymous page size is capped at 20, verified against the API. Mature and experimental sensitive-result parameters are mutually exclusive, including when set to false. Category metadata and experimental API behavior can be incomplete or change. Reports are sent only when the user explicitly submits; automated verification uses a mocked endpoint.

## Check and build

```sh
npm test
npm run lint
npm run build
```

The Creator Vite plugin produces `dist/ui.html`, `dist/plugin.js`, and `dist/manifest.json`. The production UI is static and needs no backend.

`PRD.MD` tracks product requirements and API coverage. `WORKLOG.MD` records decisions, implementation, verification, and remaining limitations.
