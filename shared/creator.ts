export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const AUDIO_FORMATS = ["mp3", "wav", "m4a", "flac", "ogg"];
export const LIBRARY_KEY = "openverse-library-v1";
export const PROVENANCE_KEY = "openverse";
export interface Provenance {
  id: string; title: string; creator: string; attribution: string;
  sourceUrl: string; licenseUrl: string; license: string; mediaUrl: string;
}
export interface AudioImport {
  url: string; format: string; filesize?: number | null; provenance: Provenance;
  placement: "playhead" | "start"; inSeconds: number; outSeconds: number | null;
  volume: number; muted: boolean; extendScene: boolean; fadeIn: number; fadeOut: number;
}
export interface CreatorContext {
  connected: boolean; audioAvailable: boolean; importing?: boolean; scene?: { id: string; name: string; fps: number; duration: number; frame: number };
  selectedAudio?: { id: string; name: string; volume: number; muted: boolean; start: number; end: number; offset: number; provenance?: Provenance };
}
export interface HostReply { type: "openverse:reply"; id: string; ok: boolean; value?: unknown; error?: string }
export interface HostState { type: "openverse:state"; value: CreatorContext }
export function isWebUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(value);
}
export function parseImport(value: unknown): AudioImport {
  if (!value || typeof value !== "object") throw new Error("Invalid audio import request.");
  const p = value as AudioImport;
  if (!isWebUrl(p.url) || typeof p.format !== "string" || !AUDIO_FORMATS.includes(p.format.toLowerCase())) throw new Error("Choose an MP3, WAV, M4A, FLAC or OGG file.");
  if (p.filesize != null && (!Number.isFinite(p.filesize) || p.filesize < 0 || p.filesize > MAX_AUDIO_BYTES)) throw new Error("Creator supports audio files up to 20 MB. Choose a smaller file.");
  if (!["playhead", "start"].includes(p.placement) || ![p.inSeconds, p.volume, p.fadeIn, p.fadeOut].every(Number.isFinite) || p.inSeconds < 0 || p.volume < 0 || p.volume > 100 || p.fadeIn < 0 || p.fadeOut < 0 || typeof p.muted !== "boolean" || typeof p.extendScene !== "boolean" || (p.outSeconds !== null && (!Number.isFinite(p.outSeconds) || p.outSeconds <= p.inSeconds))) throw new Error("Check the clip range, fades and volume.");
  const s = p.provenance;
  if (!s || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id) || ![s.title, s.creator, s.attribution, s.sourceUrl, s.licenseUrl, s.license, s.mediaUrl].every((v) => typeof v === "string") || s.license.length > 60 || JSON.stringify(s).length > 12000) throw new Error("Invalid sound attribution.");
  return p;
}
export function clipFrames(input: AudioImport, duration: number, fps: number, sceneStart: number, playhead: number) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fps) || fps <= 0) throw new Error("Creator couldn't determine the audio duration.");
  const first = Math.round(input.inSeconds * fps);
  const last = Math.min(Math.round((input.outSeconds ?? duration) * fps), Math.floor(duration * fps));
  if (first < 0 || last <= first) throw new Error("The clip starts outside this file, or is shorter than one frame.");
  const length = last - first;
  const start = input.placement === "start" ? sceneStart : Math.max(sceneStart, Math.round(playhead));
  const fadeIn = Math.round(input.fadeIn * fps), fadeOut = Math.round(input.fadeOut * fps);
  if (fadeIn + fadeOut > length) throw new Error("The fades must fit within the selected clip.");
  return { start, end: start + length, offset: start - first, fadeIn, fadeOut };
}
// Plugin data has a 5 KB byte quota; titles and URLs can contain multi-byte text.
export function provenanceJson(source: Provenance) {
  const value = { ...source };
  function bytes(text: string) { return [...text].reduce((n, c) => n + (c.codePointAt(0)! > 0xffff ? 4 : c.charCodeAt(0) > 0x7ff ? 3 : c.charCodeAt(0) > 0x7f ? 2 : 1), 0); }
  while (bytes(JSON.stringify(value)) > 4800) {
    const field = (["attribution", "title", "creator", "mediaUrl", "sourceUrl", "licenseUrl"] as const).reduce((a, b) => value[a].length >= value[b].length ? a : b);
    value[field] = value[field].slice(0, Math.floor(value[field].length * 0.8));
  }
  return JSON.stringify(value);
}
