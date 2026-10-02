# Openverse Sounds — Product Requirements

Status: simplified plugin implemented and verified in local Creator.
Created: 2026-10-01. Last updated: 2026-10-02.

## Product goal

Help Creator users find, preview, bookmark and add openly licensed sounds without leaving their animation workflow. Keep the plugin compact; Creator owns audio editing.

The user approved the reduced scope on 2026-10-02: Search → Preview → Add, saved sounds and basic filters. This supersedes the original requirement to expose every Openverse API control. Earlier decisions and verification remain in `WORKLOG.MD`.

## Confirmed requirements

- Client-only React plugin using anonymous Openverse requests. No account, API key, server or proxy.
- Dark theme and a compact single-column 400 × 640 Creator panel.
- Freesound by default, with All sources and other providers accessible.
- Search only formats Creator supports: MP3, WAV, M4A, FLAC and OGG. An empty format selection requests all five; unsupported custom extensions are rejected.
- Search, waveform previews, basic filters, saved sounds, source/license information and native Add to scene.
- Native audio integration uses the supplied Creator audio API branch; the earlier placeholder-only restriction was superseded by explicit authorization.
- Consistent rounded selects, chevron spacing and no focus rings, as requested. Preserve keyboard activation, labels and dialog keyboard controls.
- A visible home action returns to sound ideas from results, details or Saved. Clear the query and filters while retaining the chosen source; ignore late search responses after returning home.
- Keep the footer to “Powered by Openverse”; omit the Creator connection status text.
- Maintain this PRD and `WORKLOG.MD`.

## Current feature scope

| Feature | Behavior |
| --- | --- |
| Search | Explicit submit/Enter. All fields, title, creator or tags. Sound ideas are ordinary query shortcuts. |
| Source | Freesound starting view, other provider choices and All sources. Use stats to refresh available source labels. |
| Filters | Intended usage (commercial/modification), duration bands, supported formats and license. Apply explicitly; show removable chips and Reset. |
| Sort | Relevance or newest/oldest indexed. Index sorting follows the experimental Openverse API. |
| Results | Compact rows, waveform, duration/license/format, Preview, Save, Details and Add. Load more within returned pagination bounds. |
| Preview | One shared player with play/pause, seek, volume, mute and loop; survives internal navigation. No autoplay. |
| Details | Preview, Add, source, format, duration, file size, creator link, license, original source and attribution. |
| Saved sounds | Bookmarks persist in this browser through Creator; standalone choices last for the session. Restore before permitting edits and show save failures. |
| Add to scene | Choose a supported available file and place it at the current playhead or scene start. Optional explicit scene extension. |
| Layer attribution | Preserve compact provenance on the imported audio layer and expose attribution for the selected layer. |
| Help | Brief usage, license/storage/format notes and search help link. |

## Removed from the interface

- Reports, saved searches, JSON import/export and listening history.
- Exact source/creator/tag collections and provider inventory browsing.
- Independent combined-field search, source exclusion and category controls.
- Experimental ranking/sensitivity knobs, request payload/page-size options and page jumping.
- Related-sound tools, artwork controls, raw metadata, alternate-file download tools and audio-set browsing.
- Insertion source-in/out, volume, mute and fades. Full-file import defaults to 100% volume, unmuted, with no fades; Creator's timeline and Properties handle later editing.

The API client and sandbox retain tested internal contract handling. Existing saved-search records remain in storage for compatibility and are not exposed or deleted by this UI simplification. Import/export previously handled this plugin's own JSON backups, not files exported by Openverse.

## Audio import contract

Reference: `/Users/karthik/workspace/orca-worktrees/creator/feature-cpl-450-plugins-api-audio`, inspected at revision `d47ed7a45`.

- `scene.import({ type: "AUDIO", url })` imports supported anonymous, CORS-accessible files, maximum 20 MB. Creator performs the download; the sandbox does not fetch.
- Use decoded file duration and scene FPS for timing. Capture scene/playhead before import and reject a changed scene or frame rate while downloading.
- Serialize imports, validate requests, preserve existing shared assets during cleanup, and select the new layer.
- Extend the scene only when the user chooses it. Warn when a clip extends beyond the current scene.
- Store bounded UTF-8 provenance in layer plugin data. Keep the manifest ID stable for data/storage scope.
- Prefer Openverse's supplied `attribution` field. If absent, assemble a labeled fallback from title, creator, license/version and source/license links. On import, store this metadata under the layer's `openverse` plugin-data key. On selection, read it from the first selected audio layer; attribution is available for layers carrying this plugin's stored provenance, without identifying audio content or matching layer names.
- No public history batch/transaction API exists; import and configuration can occupy multiple Undo steps.
- Older hosts keep discovery but do not expose Add.

Creator's native editor can trim clips and animate volume; fades use native volume keyframes. These controls do not need a second editing interface in an asset-discovery plugin.

## Storage and requests

- Saved sounds use `creator.clientStorage` through the sandbox bridge. The inspected Creator implementation uses IndexedDB database `creator-plugins`, store `client-storage`, scoped by Creator user and plugin ID. This is browser-local storage, without cross-device syncing.
- Public plugin iframes cannot directly use localStorage/sessionStorage. Standalone state stays in memory.
- Preserve the version-1 stored library structure and legacy searches while changing saved sounds. Exclude peaks from saved data and reload them for auditioning.
- A custom typed fetch client provides a five-minute memory cache, request deduplication, timeout, validation and rate-limit cooldowns. TanStack Query is not installed.
- Search defaults: Freesound; no category restriction; waveform peaks on; hide known dead links; mature flag false; anonymous page size 20.
- Openverse rejects `mature` and `unstable__include_sensitive_results` together even when false. Send only the standard flag in this UI.
- Anonymous page sizes greater than 20 were rejected live. Respect returned pagination bounds and avoid background catalog crawling.
- Openverse format filtering follows provider metadata; available previews/alternates can differ from the original file. Native file selection separately enforces supported formats and size.

## Remaining boundaries

Provider CORS, redirects, accounts and codec support vary; show import failures and original-source links. No proxy or unsupported format conversion is added. Public host clipboard restrictions use selectable attribution text; external links use `creator.openLink` with a selectable URL fallback. Reports and direct downloads are outside the simplified UI.

Freesound is a starting pool, not a precise sound-effects classification. Previously observed source inventory was 591,450 Freesound items, 644,709 Jamendo items and 3,978,562 Wikimedia audio items. These are provider counts, not exact sound-effect counts. Known whoosh results had null categories, so no category filter is applied by default.

## Verification

- Production build, ESLint and 21 tests pass. The new format-policy test covers default inclusion of all five supported formats and rejection of OPUS/WEBM/OGA/MID/AIFF.
- Actual local Creator iframe measures 400 × 640 with scroll width 400.
- Computed select styles: 6 px radius; source padding-right 24 px, mode/sort 27 px, Add fields 30 px with chevron 10 px from the right. Native appearance disabled for consistent rendering.
- Keyboard-focused search action has no outline or box shadow. Labels, keyboard activation and Escape dismissal remain functional.
- Live Freesound whoosh search returned 240 results across supported formats and 163 with MP3 selected. Returning home restores sound ideas, clears query/filters and retains Freesound.
- Simplified import of “Deep Whoosh #1”: full MP3 at 2.13 seconds, 100% volume, unmuted, no fades. Native Properties confirmed these settings, and playback produced a nonzero scene audio meter signal.
- Saved sound restored after plugin reload. Selected-layer attribution is preserved. Prior native verification also covered trim/fades, scene extension, Undo/Redo and host links; those editing controls now belong to Creator's UI.
- Screenshots: `docs/screenshots/creator-simplified-plugin.jpg` and `docs/screenshots/creator-simple-add.jpg`.
- Updated silent walkthrough: `docs/videos/openverse-simplified-flow.mp4`. Earlier `openverse-creator-audio-flow.mp4` shows the previous expanded UI.
- Local Creator uses `http://127.0.0.1:3000/` and plugin UI `http://127.0.0.1:5173/`. A temporary Vite configuration enables the dev-loader UI; Creator's worktree is unchanged.

## References and decisions

- Supplied OpenAPI: `/Users/karthik/Downloads/Openverse API (v1).yaml`, version `909aa41ddf2115a69a447198b3f49121481e0c6b (v1)`.
- Supplied Creator worktree: public API/types, `lib/audio-format.ts`, import validation and client-storage proxy.
- [Openverse search help](https://openverse.org/search-help).
- [Adobe Stock audio in Premiere](https://helpx.adobe.com/premiere/desktop/add-audio-effects/use-adobe-stock-audio/use-adobe-stock-audio-in-your-project.html) provides a reference for finding and previewing assets in an editor. The reduced scope here is a product decision, not a claim that all audio plugins use identical controls.
- 2026-10-01: User confirmed anonymous access, client-only architecture, dark theme, discussion-first planning, Freesound focus and plugin interaction.
- 2026-10-02: User authorized implementation, then a progress commit, then native integration/local Creator verification/video.
- 2026-10-02: User approved simplifying to Search → Preview → Add with saved sounds/basic filters, removing reports/saved searches/JSON import-export/advanced insertion settings, restricting formats and fixing controls/navigation/focus styling.
