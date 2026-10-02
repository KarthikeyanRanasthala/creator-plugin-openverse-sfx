import { AUDIO_FORMATS } from "../../shared/creator.ts";

export const API_BASE = "https://api.openverse.org/v1/";
export const licenses = [
  ["cc0", "CC0"], ["by", "CC BY"], ["by-sa", "CC BY-SA"], ["pdm", "Public domain"],
  ["by-nc", "CC BY-NC"], ["by-nd", "CC BY-ND"], ["by-nc-sa", "CC BY-NC-SA"],
  ["by-nc-nd", "CC BY-NC-ND"], ["sampling+", "Sampling+"], ["nc-sampling+", "NC Sampling+"],
] as const;
export const categories = [
  ["sound_effect", "Sound effects"], ["music", "Music"], ["audiobook", "Audiobooks"],
  ["podcast", "Podcasts"], ["news", "News"], ["pronunciation", "Pronunciation"],
] as const;
export const lengths = [
  ["shortest", "Under 30 seconds"], ["short", "30 seconds – 2 minutes"],
  ["medium", "2 – 10 minutes"], ["long", "Over 10 minutes"],
] as const;
export const usageTypes = [
  ["commercial", "Use commercially"], ["modification", "Modify or adapt"],
  ["all-cc", "Creative Commons only"], ["all", "All license types"],
] as const;
export const extensions = AUDIO_FORMATS;
export const starterSources: Source[] = [
  { source_name: "freesound", display_name: "Freesound", source_url: "https://freesound.org/" },
  { source_name: "jamendo", display_name: "Jamendo", source_url: "https://jamendo.com/" },
  { source_name: "wikimedia_audio", display_name: "Wikimedia Commons", source_url: "https://commons.wikimedia.org/" },
];

export interface AudioFile {
  url?: string | null; filetype?: string | null; filesize?: number | null;
  bit_rate?: number | null; sample_rate?: number | null;
}
export interface Audio extends AudioFile {
  id: string; title?: string | null; creator?: string | null; creator_url?: string | null;
  foreign_landing_url?: string | null; source?: string | null; provider?: string | null;
  license: string; license_version?: string | null; license_url?: string | null;
  attribution?: string | null; duration?: number | null; indexed_on?: string | null;
  category?: string | null; genres?: string[] | null; thumbnail?: string | null;
  tags?: { name: string; accuracy?: number | null; unstable__provider?: string | null }[] | null;
  alt_files?: AudioFile[] | null; fields_matched?: string[] | null;
  peaks?: number[] | { points?: number[] } | null;
  unstable__sensitivity?: unknown[]; mature?: boolean;
  audio_set?: { title?: string | null; foreign_landing_url?: string | null; creator?: string | null; creator_url?: string | null; url?: string | null } | null;
}
export interface Source { source_name: string; display_name: string; source_url: string; media_count?: number }
export interface AudioPage { results: Audio[]; page: number; page_size: number; page_count: number; result_count: number; warnings?: unknown[] }
export type SearchMode = "all" | "title" | "creator" | "tags" | "fields";
export interface SearchForm {
  query: string; mode: SearchMode; title: string; creator: string; tags: string;
  sources: string[]; excludedSources: string[]; licenses: string[]; usage: string[];
  categories: string[]; lengths: string[]; extensions: string[]; customExtensions: string;
  filterDead: boolean; mature: boolean; sensitive: boolean; peaks: boolean;
  sort: "relevance" | "indexed_on"; direction: "asc" | "desc"; authority: boolean;
  authorityBoost: number; pageSize: number;
}
export interface Collection { kind: "source" | "creator" | "tag"; value: string; source?: string; label: string }
export interface SearchRequest { form: SearchForm; page: number; collection?: Collection }
export interface SavedSearch { name: string; form: SearchForm }
export const defaultForm: SearchForm = {
  query: "", mode: "all", title: "", creator: "", tags: "", sources: ["freesound"],
  excludedSources: [], licenses: [], usage: [], categories: [], lengths: [], extensions: [],
  customExtensions: "", filterDead: true, mature: false, sensitive: false, peaks: true,
  sort: "relevance", direction: "desc", authority: false, authorityBoost: 1, pageSize: 20,
};
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try { const u = new URL(value); return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined; }
  catch { return undefined; }
}
export function titleOf(audio: Audio) { return audio.title || "Untitled sound"; }
export function sourceName(value?: string | null) {
  return starterSources.find((s) => s.source_name === value)?.display_name || value || "Unknown source";
}
export function licenseName(value: string) { return licenses.find(([key]) => key === value)?.[1] || value.toUpperCase(); }
export function time(seconds?: number | null) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const n = Math.floor(seconds);
  return (n >= 3600 ? Math.floor(n / 3600) + ":" + String(Math.floor(n / 60) % 60).padStart(2, "0") : String(Math.floor(n / 60))) + ":" + String(n % 60).padStart(2, "0");
}
export function fileSize(bytes?: number | null) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";
}
export function attributionOf(a: Audio) {
  return a.attribution || '"' + titleOf(a) + '" by ' + (a.creator || "unknown creator") + " · " + licenseName(a.license) + (a.license_version ? " " + a.license_version : "") + (safeUrl(a.license_url) ? "\n" + a.license_url : "") + (safeUrl(a.foreign_landing_url) ? "\n" + a.foreign_landing_url : "") + "\nAttribution assembled from available metadata. Verify details on the source page.";
}
export function getPeaks(a: Audio): number[] {
  const values = Array.isArray(a.peaks) ? a.peaks : a.peaks?.points;
  return Array.isArray(values) ? values.filter((v) => typeof v === "number" && Number.isFinite(v)).map((v) => Math.min(1, Math.max(0, v))) : [];
}
export function validateForm(f: SearchForm): void {
  const text = [f.query, f.title, f.creator, f.tags, f.customExtensions];
  if (text.some((s) => s.length > 200)) throw new Error("Search fields must be 200 characters or fewer.");
  if (f.sources.some((s) => f.excludedSources.includes(s))) throw new Error("A source cannot be both included and excluded.");
  if (f.mature && f.sensitive) throw new Error("Choose mature content or experimental sensitive results, not both.");
  if (!Number.isInteger(f.pageSize) || f.pageSize < 1 || f.pageSize > 20) throw new Error("Choose between 1 and 20 results per page.");
  if (!Number.isFinite(f.authorityBoost) || f.authorityBoost < 0 || f.authorityBoost > 10) throw new Error("Authority boost must be between 0 and 10.");
  if (f.usage.includes("all") && f.usage.length > 1) throw new Error("All license types cannot be combined with a specific usage filter.");
  for (const [selected, allowed] of [
    [f.licenses, licenses.map(([v]) => v)], [f.usage, usageTypes.map(([v]) => v)],
    [f.categories, categories.map(([v]) => v)], [f.lengths, lengths.map(([v]) => v)],
  ] as [string[], readonly string[]][]) {
    if (selected.some((v) => !allowed.includes(v))) throw new Error("A filter contains an unsupported value.");
  }
  if (![...f.extensions, ...f.customExtensions.split(",").map((v) => v.trim()).filter(Boolean)].every((v) => /^[a-zA-Z0-9+_-]+$/.test(v))) throw new Error("File extensions may contain letters, numbers, +, _ and -.");
}
export function serializeSearch({ form: f, page, collection: c }: SearchRequest): URLSearchParams {
  validateForm(f);
  if (!Number.isInteger(page) || page < 1) throw new Error("Page numbers start at 1.");
  const p = new URLSearchParams({ page: String(page), page_size: String(f.pageSize), peaks: String(f.peaks) });
  const set = (key: string, value: string) => { if (value) p.set(key, value); };
  if (c) {
    if (!c.value || c.value.length > 200) throw new Error("A collection needs an exact name of 1–200 characters.");
    p.set("unstable__collection", c.kind);
    if (c.kind === "tag") set("unstable__tag", c.value);
    else if (c.kind === "source") set("source", c.value);
    else { if (!c.source) throw new Error("Creator collections need a source."); set("creator", c.value); set("source", c.source); }
    return p;
  }
  if (f.mode === "fields") {
    if (![f.title, f.creator, f.tags].some((s) => s.trim())) throw new Error("Enter a title, creator or tag to search.");
    for (const key of ["title", "creator", "tags"] as const) set(key, f[key].trim());
  } else {
    if (!f.query.trim()) throw new Error("Enter a search or choose a sound category below.");
    set(f.mode === "all" ? "q" : f.mode, f.query.trim());
  }
  const selectedFormats = [...new Set([...f.extensions, ...f.customExtensions.split(",")].map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (selectedFormats.some((format) => !AUDIO_FORMATS.includes(format))) throw new Error("Choose a format Creator supports: MP3, WAV, M4A, FLAC or OGG.");
  for (const [key, values] of [
    ["source", f.sources], ["excluded_source", f.excludedSources], ["license", f.licenses],
    ["license_type", f.usage], ["category", f.categories], ["length", f.lengths],
    ["extension", selectedFormats.length ? selectedFormats : AUDIO_FORMATS],
  ] as [string, string[]][]) set(key, values.join(","));
  p.set("filter_dead", String(f.filterDead));
  // The live API rejects these two parameter names together, even if both are false.
  if (f.sensitive) p.set("unstable__include_sensitive_results", "true");
  else p.set("mature", String(f.mature));
  if (f.sort === "indexed_on") { p.set("unstable__sort_by", f.sort); p.set("unstable__sort_dir", f.direction); }
  if (f.authority) { p.set("unstable__authority", "true"); p.set("unstable__authority_boost", String(f.authorityBoost)); }
  return p;
}
export function readForm(value: unknown): SearchForm {
  if (!value || typeof value !== "object") throw new Error("Invalid saved search.");
  const raw = value as Record<string, unknown>;
  const f = { ...defaultForm };
  for (const key of Object.keys(defaultForm) as (keyof SearchForm)[]) {
    const item = raw[key];
    if (Array.isArray(defaultForm[key])) {
      if (!Array.isArray(item) || item.length > 100 || !item.every((v) => typeof v === "string" && v.length <= 200)) throw new Error("Invalid saved filters.");
    } else if (typeof item !== typeof defaultForm[key]) throw new Error("Invalid saved search field.");
    Object.assign(f, { [key]: item });
  }
  if (!["all", "title", "creator", "tags", "fields"].includes(f.mode) || !["relevance", "indexed_on"].includes(f.sort) || !["asc", "desc"].includes(f.direction)) throw new Error("Invalid saved search mode.");
  validateForm(f);
  return f;
}
export function normalizeAudio(value: unknown): Audio {
  if (!value || typeof value !== "object") throw new Error("Unexpected audio response.");
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !uuidPattern.test(raw.id) || typeof raw.license !== "string") throw new Error("Unexpected audio identifier or license.");
  // Keep metadata for inspection while preventing malformed fields from reaching the UI.
  const a: Audio = { id: raw.id, license: raw.license };
  for (const key of ["title", "creator", "creator_url", "foreign_landing_url", "source", "provider", "license_version", "license_url", "attribution", "indexed_on", "category", "thumbnail", "url", "filetype"] as const) {
    if (typeof raw[key] === "string") a[key] = raw[key];
  }
  for (const key of ["duration", "filesize", "bit_rate", "sample_rate"] as const) if (typeof raw[key] === "number" && Number.isFinite(raw[key]) && raw[key] >= 0) a[key] = raw[key];
  a.tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is NonNullable<Audio["tags"]>[number] => !!t && typeof t === "object" && typeof t.name === "string").map((t) => ({ name: t.name, accuracy: typeof t.accuracy === "number" ? t.accuracy : null, unstable__provider: typeof t.unstable__provider === "string" ? t.unstable__provider : null })) : [];
  a.genres = Array.isArray(raw.genres) ? raw.genres.filter((s): s is string => typeof s === "string") : [];
  a.fields_matched = Array.isArray(raw.fields_matched) ? raw.fields_matched.filter((s): s is string => typeof s === "string") : [];
  a.mature = raw.mature === true;
  a.unstable__sensitivity = Array.isArray(raw.unstable__sensitivity) ? raw.unstable__sensitivity : [];
  a.peaks = getPeaks(raw as unknown as Audio);
  a.alt_files = Array.isArray(raw.alt_files) ? raw.alt_files.filter((f) => f && typeof f === "object" && typeof f.url === "string").map((f) => ({
    url: safeUrl(f.url), filetype: typeof f.filetype === "string" ? f.filetype : undefined,
    filesize: typeof f.filesize === "number" ? f.filesize : undefined, bit_rate: typeof f.bit_rate === "number" ? f.bit_rate : undefined, sample_rate: typeof f.sample_rate === "number" ? f.sample_rate : undefined,
  })) : [];
  if (raw.audio_set && typeof raw.audio_set === "object") {
    const set = raw.audio_set as Record<string, unknown>;
    a.audio_set = Object.fromEntries(Object.entries(set).filter(([k, v]) => ["title", "foreign_landing_url", "creator", "creator_url", "url"].includes(k) && typeof v === "string"));
  }
  return a;
}
export function filterChips(f: SearchForm): { label: string; key: keyof SearchForm; value?: string }[] {
  const chips: { label: string; key: keyof SearchForm; value?: string }[] = [];
  for (const [key, values, labels] of [
    ["licenses", f.licenses, licenses], ["usage", f.usage, usageTypes], ["categories", f.categories, categories],
    ["lengths", f.lengths, lengths], ["extensions", f.extensions, []],
    ["excludedSources", f.excludedSources, []],
  ] as [keyof SearchForm, string[], readonly (readonly [string, string])[]][]) {
    values.forEach((v) => chips.push({ key, value: v, label: (key === "excludedSources" ? "Exclude " : "") + (labels.find(([k]) => k === v)?.[1] || v.toUpperCase()) }));
  }
  if (f.customExtensions) chips.push({ key: "customExtensions", label: f.customExtensions });
  if (!f.filterDead) chips.push({ key: "filterDead", label: "Include broken links" });
  if (f.mature) chips.push({ key: "mature", label: "Mature included" });
  if (f.sensitive) chips.push({ key: "sensitive", label: "Sensitive included" });
  if (f.authority) chips.push({ key: "authority", label: "Authority ×" + f.authorityBoost });
  if (!f.peaks) chips.push({ key: "peaks", label: "Waveforms off" });
  if (f.pageSize !== 20) chips.push({ key: "pageSize", label: f.pageSize + " / page" });
  return chips;
}
