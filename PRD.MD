# Openverse SFX — Product Requirements

Status: audio explorer implemented and verified in standalone Chrome and the Creator iframe; native Creator audio operations remain deferred.
Created: 2026-10-01. Last updated: 2026-10-02.

## Product goal

Help LottieFiles Creator users find, audition, inspect, and collect openly licensed audio through Openverse. Provide every applicable audio API control in a usable dark interface, with common choices easy to reach and advanced choices available through progressive disclosure.

The initial product is an audio exploration UI. Creator audio insertion becomes a separate future integration when the Creator Plugin API supports it and the user authorizes that work.

## Confirmed user requirements

- Use the existing LottieFiles Creator Plugin Starter template.
- Use anonymous Openverse API requests; no registration, login, API keys, or token flow.
- Keep the app entirely client-only; no server, proxy, backend database, or hosted secrets.
- Expose all applicable controls in the supplied audio API specification, including experimental controls.
- Use a dark theme.
- Default to Freesound, with other Openverse sources still accessible.
- Make the UI and interaction feel like a compact Creator plugin.
- Discuss features before starting application implementation.
- Keep `plugin.js` as a placeholder; do not implement Creator audio operations. The template's sandbox source is `plugin/plugin.ts`, which builds to `plugin.js`.
- Maintain this file and `WORKLOG.MD` throughout planning and implementation.
- NPM packages may be used when helpful.
- For future Creator testing, open https://creator.lottiefiles.com/ directly.

## Evidence and references

- Supplied API contract: `/Users/karthik/Downloads/Openverse API (v1).yaml`.
- Supplied specification version: `909aa41ddf2115a69a447198b3f49121481e0c6b (v1)`.
- [Openverse audio search UI](https://openverse.org/search/audio?q=whoosh), inspected in Chrome on 2026-10-01.
- [Openverse sources](https://openverse.org/sources), inspected in Chrome on 2026-10-01 for current audio inventory.
- [Openverse API documentation](https://api.openverse.org/v1/), particularly the supplied spec's authentication, audio search, and endpoint definitions.
- [Openverse authentication and throttling reference](https://docs.openverse.org/api/reference/authentication_and_throttling.html).
- [Openverse search help](https://openverse.org/search-help); link to this for query syntax help rather than inventing a separate syntax.
- Repository skills: `.agents/skills/creator-plugin-development/SKILL.md` and `.agents/skills/creator-plugins-ui/SKILL.md`.

The supplied spec permits anonymous requests for every audio endpoint through an empty security alternative. Its `/v1/rate_limit/` endpoint requires a token and is excluded from this anonymous app. The specification does not define fixed anonymous request ceilings or maximum page size; do not adopt unverified numbers from third-party guides.

### Live inventory and category quality — 2026-10-01

The user requested a sound-effects count before deciding the default view. Openverse's public source inventory reported:

| Audio source | Indexed audio items |
| --- | ---: |
| Freesound | 591,450 |
| Jamendo | 644,709 |
| Wikimedia Commons | 3,978,562 |
| Total across these sources | 5,214,721 |

These are source catalog counts, not exact sound-effect counts. Freesound is a useful starting pool for sound discovery, but labeling all of its records as sound effects would overstate what the statistics establish.

Live anonymous browser requests returned 240 results for `q=whoosh&page_size=1`, including “Deep Whoosh #1” from Freesound with `category: null`. Adding `category=sound_effect` to that same query returned zero results. An unqualified category-only request also returned zero; that is not a reliable count of actual sound effects. The API's exposed stats contain source totals rather than category totals, so an exact sound-effects catalog total was not established.

The initial recommendation after this check was all audio with a Freesound preset. The user subsequently chose a Freesound-focused starting view. Confirmed default: `source=freesound`, with no category constraint. Keep other sources and every category available through controls; incomplete category metadata must not hide sounds by default.

Observed anonymous search response headers advertised `20/min` burst and `200/day` sustained limits. These are observations from this session, not permanent product constants; still read available headers and handle 429 at runtime.

## User journey

1. Open the plugin with Freesound selected, then search for a sound or choose a suggested query. An empty search shows useful starting points rather than claiming to display the whole catalog.
2. Narrow results by intended use, license, category, duration band, source, or format.
3. Audition tracks directly from result rows; compare them using one shared player.
4. Open track details to inspect provenance, technical metadata, alternate files, and attribution.
5. Explore related tracks or exact tag, creator, and source collections.
6. Copy attribution and links, open the original source, and optionally shortlist or download available files.

## Implemented feature set

| ID | Feature | Behavior | Scope |
| --- | --- | --- | --- |
| F01 | Audio search | General query, title-only, creator-only, and tag-only search; advanced field search without `q`; explicit submit and query syntax help. | Core |
| F02 | Complete filters | Freesound selected by default. All API categories, duration bands, licenses, usage types, extensions, source inclusion/exclusion, and dead-link filtering remain accessible. Multi-select wherever the API accepts comma-separated values. | Core |
| F03 | Search state | Active filter chips, counts of active selections, remove one, clear all, reset page after search changes, and preserve results while editing filters. | Core |
| F04 | Results browser | Compact rows with title, creator, duration, source, format, license badge, play action, and waveform when available; result count, bounded pagination, and page-size control. | Core |
| F05 | Shared preview player | User-initiated play/pause, seek, elapsed/total time, volume/mute, whole-track loop, and one playing track at a time. A sticky player survives opening details and changing views within the plugin. | Core |
| F06 | Track details | Artwork, category, genres, tags, technical metadata, audio-set metadata, indexed date, provider/source, matched fields, sensitivity information when supplied, and an optional normalized metadata view. | Core |
| F07 | Attribution and provenance | Copy the API's attribution text, copy source/media links, open creator and original asset pages, and open the supplied license URL. Fallback attribution must preserve available metadata and label missing fields. | Core |
| F08 | Related audio | Explicitly load related tracks in the detail view; retain navigation back to the original results. | Complete explorer |
| F09 | Collection browsing | Exact tag, source, and creator-with-source collections with a collection banner and clear return navigation. Preserve search filters for returning to search. | Complete explorer |
| F10 | Source directory | Load source names and display labels dynamically from audio stats; show catalog counts and source links. Use the same data for include/exclude controls. | Complete explorer |
| F11 | Experimental controls | Index-date sorting/direction, authority preference and boost, experimental sensitive-result inclusion, and collections. Label unstable behavior and expose dependencies in the UI. | Full API coverage |
| F12 | Waveform options | Toggle inline peaks in search responses; fetch individual waveform data only when needed. Keep playback usable without a waveform. | Full API coverage |
| F13 | Artwork options | Advanced original-size/compression controls for the thumbnail endpoint; use compressed thumbnails by default. | Full API coverage |
| F14 | Reports | User-initiated report dialog with asset identifier, reason, description, explicit submit, success/failure state, and duplicate-submit prevention. No automatic reports. | Full API coverage |
| F15 | File selection and access | Show original and alternative formats with size, bitrate, and sample rate when supplied. Preview supported files; offer download where browser/provider behavior permits, otherwise open the file or source page. | Session convenience |
| F16 | Shortlist and saved searches | Session-only favorites, recently auditioned tracks, and reusable query/filter presets. Optional JSON export/import preserves choices across sessions without sandbox storage handlers. | Session convenience |
| F17 | Suggested starting points | Query shortcuts such as whoosh, impact, click, ambience, and music; these run regular searches and are not curated API collections. | Session convenience |
| F18 | Resilient requests | Loading/empty/offline/error states, ignore outdated search responses, deduplicate requests, cache metadata in memory, display API warnings, and handle throttling without request storms. | Core |
| F19 | Accessibility | Keyboard search and playback, labeled controls, visible focus, accessible seek/volume controls, dialog focus management, sufficient dark-theme contrast, and no autoplay. | Core |

All listed features are implemented. Scope labels preserve the original delivery priorities; experimental controls remain labeled and available. Provider-dependent file operations use host-aware fallbacks.

## Audio search control coverage

Endpoint: `GET https://api.openverse.org/v1/audio/`.

The supplied specification exposes 23 search parameters. Each needs a UI control or a directly user-controlled behavior.

| Parameter | UI control or behavior | Rules and defaults |
| --- | --- | --- |
| `q` | General search input | Up to 200 characters; omit when empty or when searching specific fields. |
| `title` | Title search field | 1–200 characters when supplied; incompatible with `q`; fuzzy matching. |
| `creator` | Creator search field | 1–200 characters; ignored by API when `q` is present, so prevent that combination. Exact in creator collection mode. |
| `tags` | Tag search field | 1–200 characters; incompatible with `q`; fuzzy matching, including comma-separated terms. |
| `source` | Source picker and included sources multi-select | Default `freesound`; use `source_name` from stats. Offer All sources and specific/multiple sources; collections accept only one source. |
| `excluded_source` | Excluded sources multi-select | Use stats values; prevent a source appearing in both included and excluded selections. |
| `license` | License multi-select | Support all 10 listed licenses, including legacy sampling licenses. |
| `license_type` | Usage controls / advanced license-type selector | Support `all`, `all-cc`, `commercial`, and `modification`; comma-separated combinations are supported by the contract. Avoid mixing an “all” reset choice with restrictive choices. |
| `category` | Category multi-select | `audiobook`, `music`, `news`, `podcast`, `pronunciation`, `sound_effect`. Category metadata can be null; explain that filtering may hide relevant tracks. |
| `length` | Duration-band multi-select | `shortest`, `short`, `medium`, `long`; use service-defined bands, not an arbitrary exact-seconds slider. |
| `extension` | Format multi-select plus custom extensions | The API does not enumerate valid extensions. Offer common choices and custom comma-separated values; searchability does not imply browser playback support. |
| `filter_dead` | Hide known broken links toggle | Default `true`; does not guarantee every returned provider URL works. |
| `mature` | Include mature-marked content toggle | Default `false`. Send `mature` only when the experimental sensitivity flag is omitted. The live API rejects both parameter names together even when false. |
| `unstable__include_sensitive_results` | Experimental include-sensitive-results toggle | Default off/omitted. Enabling sends only `unstable__include_sensitive_results=true` and disables the mature toggle. Show sensitivity labels when returned. |
| `unstable__sort_by` | Sort selector | `relevance` by default or `indexed_on`; label the latter “Date indexed”, not date created or uploaded. |
| `unstable__sort_dir` | Oldest/newest indexing direction | `asc` or `desc` (default); only available with `indexed_on`, never with relevance. |
| `unstable__authority` | Prefer authoritative sources toggle | Default `false`; experimental relevance boost. |
| `unstable__authority_boost` | Authority boost numeric control | Range 0–10; default 1; enabled only when authority preference is enabled. |
| `unstable__collection` | Browse mode: tag/source/creator | Experimental; use a dedicated collection mode that omits incompatible search filters. |
| `unstable__tag` | Exact collection tag input | Required for tag collection; 1–200 characters; preserve exact case, accents, spacing, and word order. |
| `peaks` | Include waveforms in search results toggle | Default API value `false`; app default `true`. Inline peaks were verified in live searches and rendered without decoding full remote files. |
| `page` | Previous/next or load-more navigation; optional page jump | Start at 1; never exceed returned `page_count`. Reset on query, filter, sort, or page-size changes. |
| `page_size` | Results per request control | Default 20; range 1–20. Live anonymous requests with 21 returned HTTP 401 and an explicit maximum-20 message. |

License values: `by`, `by-nc`, `by-nc-nd`, `by-nc-sa`, `by-nd`, `by-sa`, `cc0`, `nc-sampling+`, `pdm`, `sampling+`. Common choices appear first; less common choices stay reachable.

Openverse's inspected UI labels the duration bands as under 30 seconds, 30 seconds–2 minutes, 2–10 minutes, and over 10 minutes. The YAML lists the enum values without boundary definitions; boundary semantics remain service-defined.

Common format choices observed in Openverse: FLAC, MID, MP3, OGA, OGG, OPUS, WAV, and WEBM. Permit custom extensions because these are UI suggestions, not a schema enum.

### Search and collection compatibility

- Provide “All fields” and “Specific fields” modes. Specific fields can have independent title, creator, and tag terms; omit `q` entirely. Live title `whoosh` + creator `Kinoton` search returned six sounds in the Creator iframe.
- Tag collection requires `unstable__collection=tag` and `unstable__tag`.
- Source collection requires `unstable__collection=source` and one `source`.
- Creator collection requires `unstable__collection=creator`, one exact `creator`, and one exact `source`.
- Collections are newest-indexed-first according to the spec and do not support ordinary filters such as licenses. Display that mode clearly, omit unsupported filters, and restore them when returning to search.
- Do not invent sorting by duration, popularity, bitrate, or random order. The exposed server sort fields are relevance and index date.
- Treat all `unstable__` parameters as experimental. If the API rejects one, explain the failed control and let users retry with it removed; avoid silently changing the request.

## Supporting endpoint coverage

| Endpoint | Feature and exposed controls |
| --- | --- |
| `GET /v1/audio/{identifier}/` | Track details fetched by a result’s UUID; reuse search metadata while fetching details. Explicit Refresh bypasses the metadata cache. No additional query controls appear in this spec. |
| `GET /v1/audio/{identifier}/related/` | Similar-track discovery. The spec declares only the identifier; do not assume it accepts search filters or pagination parameters merely because its response is paginated. |
| `GET /v1/audio/{identifier}/waveform/` | On-demand waveform peaks. Response is `{ len, points }`, with values between 0 and 1 and approximately 1,000 points. No fixed point count. |
| `GET /v1/audio/{identifier}/thumb/` | Artwork with `full_size` and `compressed`. `full_size` defaults to false; omitted compression defaults to the opposite of `full_size`. Allow default/explicit compression states. |
| `GET /v1/audio/stats/` | Dynamic source list, labels, source URLs, and catalog counts. `logo_url` is deprecated and may be null; do not depend on it. |
| `POST /v1/audio/{identifier}/report/` | Body includes matching `identifier`, `reason` (`mature`, `dmca`, `other`), and optional `description` up to 500 characters. Require explicit user submit; do not make this request while testing ordinary browsing. |

The search endpoint plus these six supporting endpoints cover all seven audio paths in the supplied spec. Image and registration/token endpoints are outside the audio-only, anonymous scope.

## Metadata presentation

- Present duration in human units; the API provides milliseconds.
- Present bitrate in kbps from bits per second, sample rate in kHz from hertz, and file size in appropriate byte units.
- Handle missing/null title, creator, artwork, tags, audio set, genres, formats, and URLs gracefully; do not present missing numeric values as zero.
- Distinguish `provider` from `source`; they can differ.
- Show technical attributes for alternate files independently from the main file.
- Show tag accuracy and tag provider in advanced details when supplied; do not fabricate accuracy for human tags.
- Show audio-set/album information and its source links; the spec does not expose an endpoint to browse every item in an audio set.
- Preserve the supplied attribution and license version/link. The catalog metadata is useful context; do not present an asset as guaranteed suitable for every use.
- `genres`, exact duration, bitrate, sample rate, file size, and audio-set metadata are display fields, not available server-side search filters in this spec.
- The endpoint descriptions mention inline `peaks` and `unstable__sensitivity`, but the `Audio` schema omits these properties. Model them as optional runtime fields and verify payloads before relying on them.

## Plugin UI and interaction requirements

Confirmed direction: a Freesound-focused dark Creator plugin. Use Creator UI components where appropriate, with the dark class applied at the document root. Prefer charcoal surfaces, clear text hierarchy, subtle separators, and one accent color for the active player and primary actions. Match Creator's control sizing, typography, spacing, focus behavior, and tooltips through the supplied UI library.

Proposed initial panel: about 400 px wide and 640 px tall, adapting to narrower and taller host panels. Use one column without horizontal scrolling; validate the actual host dimensions during implementation. Exact size is an implementation choice, not a newly approved sandbox change.

1. Small header with plugin name, visible Freesound source picker, and an overflow menu for help and source browsing.
2. Search input as the primary control; submit with Enter or the search action. Specific-field options are on demand.
3. A compact toolbar with Filters, active count, and sort; selected filters appear as removable chips. License, duration, and format are the first filter groups.
4. One scrolling results list. Dense rows show play/pause, title, creator, duration, license, and a small waveform. Avoid large artwork or redundant source labels when every result is from Freesound.
5. Track details replace the list inside the panel, with a back action restoring the exact query, filters, loaded results, and scroll position. Playback continues across internal navigation.
6. A compact sticky mini-player appears after a track is selected. Keep play/pause, seek, time, and mute readily available; volume and loop can use small additional controls or a popover.
7. If the shortlist is included, use at most two primary tabs: Explore and Saved. Source directory and advanced tools remain accessible from menus or internal views.

Filters open in a panel-sized drawer or internal view with grouped sections, Apply, and Reset filters. Editing a group does not send a request until Apply. Reset filters clears optional refinements while retaining the explicitly chosen source and query; resetting the entire search returns to the Freesound starting view. Every API control remains accessible, including categories and include/exclude sources, without crowding the normal browsing view. Put less common ranking, sensitivity, dead-link, payload, and artwork choices under Advanced.

Start with sound-oriented query shortcuts such as Whoosh, Impact, Click, and Ambience. Source choice is a real search control: selecting All sources removes the `source` restriction, and every relevant view shows the current source scope. Freesound focus does not mean setting `category=sound_effect` or labeling all Freesound records as sound effects.

Keep routine auditioning quick: click Play to audition, click a waveform to seek, click the title/details action to inspect, and open details for secondary actions. Interactive controls must not accidentally open details or trigger another row action. Keyboard shortcuts apply to the player only when focus is outside text inputs; search typing must remain unaffected. Essential controls cannot depend exclusively on hover.

Use compact in-panel loading, empty, error, and retry states that retain the user's query and filter context. Avoid a website-style hero, marketing copy, large global navigation, or multiple simultaneous sidebars. No usable Add to Creator action is shown while native audio integration remains deferred.

UI inspiration from Openverse remains waveform-led rows, creator/license context, grouped multi-select filters, and explicit load more. Adapt these to the small Creator panel and its interaction conventions.

## Client-only architecture and limitations

- All Openverse requests, media playback, waveform rendering, and UI state live in `src/`.
- Use anonymous fetches without an Authorization header or credentials. Query serialization and compatibility checks belong in one typed API layer.
- Keep `plugin/plugin.ts` and the generated `plugin.js` as a minimal shell with placeholders. Do not add storage, audio import, scene mutation, or other functional message handlers during this phase.
- Use a shared HTML audio element for previews. Prefer supplied inline/server peaks for waveform rendering, so waveform UI does not require fetching and decoding every remote audio file.
- Browser/provider CORS, HTTPS, redirects, codec support, and download policies can vary. Display actionable fallback links; a server proxy is not an option.
- A cross-origin `download` attribute alone cannot guarantee a download. Fetch-to-blob can work when CORS and file sizes permit; otherwise open the source/file.
- Creator's sandboxed UI may block browser storage APIs. Do not promise persistent favorites with `localStorage`, `sessionStorage`, or IndexedDB without verifying the host. With sandbox handlers prohibited, use in-memory session state and optional user-triggered JSON export/import.
- Clipboard access may be unavailable in the iframe; offer selectable attribution text as a fallback.
- Read rate-limit and retry headers when exposed to browser JavaScript. Handle 429 even if headers are missing or hidden by CORS. Do not call the authenticated `/rate_limit/` endpoint.
- Use API warnings as displayable diagnostics; warning wording/schema is unstable and must not drive brittle parsing logic.
- Respect returned pagination bounds. Search is not an exhaustive catalog export; do not fetch beyond available pages or add bulk catalog crawling.
- Start with explicit search/filter submission and in-memory caching. Avoid automatic detail/related fetches for every row, infinite eager pagination, and per-keystroke requests.

Installed dependencies: `@lottiefiles/creator-plugins-ui` for controls and dialogs, and `lucide-react` for icons. A small typed fetch client handles caching, deduplication, timeouts, and throttling. The shared native audio element and SVG peaks do not require a separate waveform package.

## Delivery sequence (completed)

1. Record the confirmed Freesound default and plugin UI requirements; settle remaining convenience scope and begin implementation when requested.
2. Build dark UI and anonymous API layer: search modes, common filters, result rows, pagination, shared preview player, details, attribution, and request states.
3. Complete API coverage: remaining advanced controls, related audio, source directory, collections, artwork controls, and report UI.
4. Add agreed convenience features: session shortlist, saved searches, JSON export/import, and alternate-file/download actions.
5. Verify standalone-browser and Creator-iframe behavior without implementing native audio operations.

The initial discussion respected the implementation pause. The user authorized implementation on 2026-10-02.

## Acceptance criteria for implementation

- Every one of the 23 search parameters and both thumbnail parameters is mapped to usable controls/behavior; every applicable audio endpoint has an explicit feature or user action.
- Compatible requests are serialized without empty values or ignored field combinations; invalid combinations are explained before requesting.
- Source controls use live stats values, and all category/license/duration enums remain available.
- Initial source selection is Freesound, with no category restriction; All sources and other providers remain reachable. Empty-query startup presents sound-search suggestions.
- Default/general, field, and collection searches each work; experimental controls can fail without breaking ordinary search.
- Pagination resets appropriately and stops at server bounds; supported anonymous page size is verified rather than guessed.
- One track plays at a time, all playback begins from user action, and preview failures/waveform failures have clear fallbacks.
- Attribution, provenance, nullable metadata, unit conversions, and alternate formats are presented accurately.
- Related tracks, collection navigation, thumbnail options, and user-submitted reports follow their documented contracts.
- Throttling, validation errors, partial warnings, missing assets, offline conditions, unsupported codecs, blocked storage/clipboard, and provider failures are handled.
- Dark theme and keyboard controls work in both standalone and Creator contexts, including compact panel dimensions.
- The interface fits a compact single-column plugin panel without horizontal scrolling. Internal details and filters preserve search context; the player persists across internal navigation.
- Run appropriate typecheck, lint, and production build checks after implementation; verify real browser/network behavior with a small, purposeful set of requests.
- No Creator audio operations, persistent sandbox storage handlers, server dependencies, or exposed secrets are introduced.
- `PRD.MD` and `WORKLOG.MD` reflect accepted decisions, implemented features, verification results, and remaining limitations after each meaningful work phase.

## Verified decisions and remaining limitations

| Item | Recommendation / current status |
| --- | --- |
| Default source and category | Confirmed by user: Freesound-focused. Set `source=freesound`; leave category unset and keep all sources/categories accessible. |
| Plugin feel and panel size | Verified actual 400 × 640 Creator iframe. Compact single-column UI, 376 × 616 scrollable filter dialog, internal details, and persistent mini-player. |
| Convenience scope | Implemented session shortlist, saved searches, recent previews, export/import, and provider-dependent file access. JSON paste import was verified in Creator. |
| Native Creator integration | Deferred by explicit user instruction. No usable “Add to Creator” action until supported and requested. |
| Persistence | Session-only. Export/import implemented; waveform samples are omitted from exported JSON to keep files small and fetched again when previewed. Closing/reloading loses unexported choices. |
| Anonymous quotas and page-size maximum | Maximum 20 results per anonymous request verified live. Quotas are observed only when response headers are exposed; no authenticated quota endpoint or hardcoded daily ceiling. |
| Inline peaks and sensitivity | Live inline peaks and sensitivity arrays were observed. Treat both as optional; playback works without peaks and loads the waveform endpoint on demand. |
| Usage filters and combined fields | All contract usage values exposed without invented presets. Combined title/creator search verified live; not every usage/experimental combination has been checked against each provider. |
| Embedded media/file operations | Actual Creator iframe allows scripts only. API fetch and Freesound playback verified; clipboard writes, popup links, downloads, and native form submits are restricted. Client click/Enter handlers and selectable URL/text/JSON fallbacks are implemented. Artwork, alternate formats, and provider availability remain asset-dependent. |

## Host compatibility and verification

- Real Creator development loader accepted the loopback HTTP URL. No system certificate trust changes were made.
- Search/filters, specific-field Enter submission, preview playback across details, session save/export/paste import, and source/file copy fallbacks were verified in the actual sandboxed iframe.
- Standalone checks cover search, load more, real waveforms, related results, attribution copy, and session conveniences. Native Creator audio insertion is intentionally absent.
- Shared requests stay alive for cache reuse; stale UI responses are ignored. This is not a claim that every obsolete network request is cancelled.
- Reports are implemented from the contract and transport-tested with a mock. No live test reports were submitted. Experimental filters and provider files can fail independently of normal search.
- Verification commands and final results are recorded in `WORKLOG.MD`.

## Decision history

- 2026-10-02: User authorized implementation. Build the discussed client-only UI and API explorer, including session conveniences, while keeping Creator sandbox code as a placeholder.
- 2026-10-01: User established anonymous access, client-only architecture, dark theme, discussion-first workflow, living PRD/worklog, and placeholder-only Creator sandbox code.
- 2026-10-01: Initial feature proposal derived from supplied OpenAPI spec and observed Openverse dark audio UI. All feature priorities and UI recommendations remain discussion drafts.
- 2026-10-01: User requested sound-effects inventory before choosing a default. Checked live source counts and anonymous API responses; revised default recommendation from Sound effects filtering to all audio with an optional Freesound preset because relevant tracks have null category metadata.
- 2026-10-01: User chose Freesound focus and emphasized plugin UI/interaction. Confirmed `source=freesound` without a category restriction; expanded compact layout, navigation, filter, and player requirements. Other sources and the full API-control scope remain accessible.
