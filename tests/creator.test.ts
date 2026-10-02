import test from "node:test";
import assert from "node:assert/strict";
import type { CreatorAPI } from "@lottiefiles/creator-api-types";
import { createRuntime } from "../plugin/runtime.ts";
import { clipFrames, MAX_AUDIO_BYTES, parseImport, provenanceJson } from "../shared/creator.ts";
import type { AudioImport, HostReply } from "../shared/creator.ts";

const input: AudioImport = { url: "https://cdn.example.com/clip.mp3", format: "mp3", placement: "playhead", inSeconds: 1, outSeconds: 3, volume: 65, muted: false, extendScene: false, fadeIn: 0.2, fadeOut: 0.3, provenance: { id: "4b3d4812-8018-4b9c-80db-318be3f6ae2e", title: "Whoosh", creator: "Artist", attribution: "Whoosh by Artist / CC BY", sourceUrl: "https://example.com/sound", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", license: "by", mediaUrl: "https://cdn.example.com/clip.mp3" } };
function fixture(audioSupported = true) {
  const replies: HostReply[] = [];
  const keys: { frame: number; value: number }[] = [];
  const data = new Map<string, string>();
  let removed = false, imports = 0;
  const layer = { type: "AUDIO_LAYER", id: "layer", name: "Audio", startFrame: 0, endFrame: 300, timelineOffset: 0, muted: false,
    volume: { staticValue: 100, getValueAt() { return this.staticValue; }, addKeyframes(value: typeof keys) { keys.push(...value); } },
    data: { set: (key: string, value: string) => { data.set(key, value); }, get: (key: string) => data.get(key) },
    audio: { id: "asset", name: "Asset", getDuration: async () => 10, remove: () => { removed = true; } }, remove: () => { removed = true; } };
  const scene = { id: "scene", name: "Main Scene", framerate: 30, duration: 5, import: async () => { imports++; return layer; } };
  const storage = new Map<string, unknown>();
  const api = { activeScene: scene, assets: [] as { id: string }[], timeline: { currentFrame: 90 }, selection: { nodes: [] },
    on: (event: string) => { if (event === "change:audio" && !audioSupported) throw new Error("Unknown event"); },
    ui: { postMessage: (reply: HostReply) => { if (reply.type === "openverse:reply") replies.push(reply); } },
    clientStorage: { get: async (key: string) => storage.get(key), set: async (key: string, value: unknown) => { storage.set(key, value); } }, openLink: () => {} };
  return { handle: createRuntime(api as unknown as CreatorAPI), replies, keys, data, layer, scene, api, get removed() { return removed; }, get imports() { return imports; } };
}
test("source trim keeps source offset distinct from playhead and fits fractional-fps scenes", () => {
  assert.deepEqual(clipFrames(input, 10, 30, 0, 90), { start: 90, end: 150, offset: 60, fadeIn: 6, fadeOut: 9 });
  const clip = clipFrames({ ...input, placement: "start", outSeconds: null, fadeIn: 0, fadeOut: 0 }, 3.25, 29.97, 10, 100);
  assert.equal(clip.start, 10); assert.equal(clip.offset, -20); assert.equal(clip.end, 77);
});
test("import validation rejects oversize, unsupported, invalid clips and overlapping fades", () => {
  assert.throws(() => parseImport({ ...input, filesize: MAX_AUDIO_BYTES + 1 }), /20 MB/);
  assert.throws(() => parseImport({ ...input, format: "opus" }), /MP3/);
  assert.throws(() => parseImport({ ...input, url: "javascript:alert(1)" }), /MP3/);
  assert.throws(() => parseImport({ ...input, outSeconds: 0.5 }), /clip range/);
  assert.throws(() => clipFrames({ ...input, inSeconds: 12 }, 10, 30, 0, 0), /outside/);
  assert.throws(() => clipFrames({ ...input, fadeIn: 2, fadeOut: 2 }, 10, 30, 0, 0), /fades/);
});
test("audio import applies trim, percent volume, mute, fades, attribution and selection", async () => {
  const f = fixture(); await f.handle({ type: "openverse:import", id: "1", value: { ...input, muted: true, extendScene: true } });
  assert.equal(f.replies[0].ok, true); assert.equal(f.layer.startFrame, 90); assert.equal(f.layer.endFrame, 150); assert.equal(f.layer.timelineOffset, 60);
  assert.equal(f.layer.volume.staticValue, 65); assert.equal(f.layer.muted, true); assert.equal(f.layer.name, "Whoosh"); assert.equal(f.api.selection.nodes.length, 1);
  assert.deepEqual(f.keys, [{ frame: 90, value: 0 }, { frame: 96, value: 65 }, { frame: 141, value: 65 }, { frame: 150, value: 0 }]);
  assert.equal(JSON.parse(f.data.get("openverse")!).id, input.provenance.id);
});
test("post-import failure removes owned asset; unsupported host never mutates scene", async () => {
  const f = fixture(); await f.handle({ type: "openverse:import", id: "bad", value: { ...input, inSeconds: 12, outSeconds: null } });
  assert.equal(f.replies[0].ok, false); assert.equal(f.removed, true);
  const old = fixture(false); await old.handle({ type: "openverse:import", id: "old", value: input });
  assert.equal(old.imports, 0); assert.match(old.replies[0].error!, /doesn't support/);
});
test("failed clip configuration preserves any existing shared sound asset", async () => {
  const f = fixture(); f.api.assets = [{ id: "asset" }]; let assetRemoved = false, layerRemoved = false;
  f.layer.audio.remove = () => { assetRemoved = true; }; f.layer.remove = () => { layerRemoved = true; };
  await f.handle({ type: "openverse:import", id: "bad", value: { ...input, inSeconds: 12, outSeconds: null } });
  assert.equal(f.replies[0].ok, false); assert.equal(assetRemoved, false); assert.equal(layerRemoved, true);
});
test("scene extension is opt-in and scene changes during download remove only the new import", async () => {
  const f = fixture(); await f.handle({ type: "openverse:import", id: "extend", value: { ...input, outSeconds: null, extendScene: true } });
  assert.equal(f.scene.duration, 12);
  const changed = fixture(); changed.scene.import = async () => { changed.api.activeScene = { ...changed.scene, id: "other" }; return changed.layer; };
  await changed.handle({ type: "openverse:import", id: "changed", value: input });
  assert.equal(changed.replies[0].ok, false); assert.equal(changed.removed, true);
});
test("duplicate concurrent import is rejected while the first request completes", async () => {
  const f = fixture(); let finish!: (value: typeof f.layer) => void;
  f.scene.import = () => new Promise((resolve) => { finish = resolve; });
  const first = f.handle({ type: "openverse:import", id: "first", value: input });
  await f.handle({ type: "openverse:import", id: "second", value: input });
  assert.match(f.replies[0].error!, /already running/); finish(f.layer); await first; assert.equal(f.replies[1].ok, true);
});
test("saved library round trips through host storage; malformed messages cannot overwrite it", async () => {
  const f = fixture(); const value = JSON.stringify({ version: 1, tracks: [], searches: [] });
  await f.handle({ type: "openverse:save", id: "save", value }); await f.handle({ type: "openverse:save", id: "bad", value: "{}" }); await f.handle({ type: "openverse:load", id: "load" });
  assert.equal(f.replies[0].ok, true); assert.equal(f.replies[1].ok, false); assert.equal(f.replies[2].value, value);
});
test("provenance fits the node byte quota even with emoji and CJK attribution", () => {
  const text = provenanceJson({ ...input.provenance, attribution: "🎧音".repeat(1500) });
  assert.ok(Buffer.byteLength(text) <= 4800); assert.equal(JSON.parse(text).id, input.provenance.id);
});
