import { normalizeAudio, readForm } from "./model.ts";
import type { Audio, SavedSearch } from "./model.ts";
export function downloadJson(data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = "openverse-saved-sounds.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readSession(text: string): { tracks: Audio[]; searches: SavedSearch[] } {
  if (text.length > 2_000_000) throw new Error("Choose a saved-sounds file smaller than 2 MB.");
  const data = JSON.parse(text) as Record<string, unknown>;
  if (!data || data.version !== 1 || !Array.isArray(data.tracks) || !Array.isArray(data.searches) || data.tracks.length > 500 || data.searches.length > 100) throw new Error("This isn't a supported Openverse saved-sounds file.");
  const tracks = [...new Map(data.tracks.map((value) => { const a = normalizeAudio(value); return [a.id, a] as const; })).values()];
  const searches = data.searches.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid saved search.");
    const s = value as Record<string, unknown>;
    if (typeof s.name !== "string" || !s.name.trim() || s.name.length > 200) throw new Error("Invalid saved search name.");
    return { name: s.name, form: readForm(s.form) };
  });
  return { tracks, searches };
}
