import assert from "node:assert/strict";
import test from "node:test";
import { defaultForm, normalizeAudio, safeUrl, serializeSearch, time, readForm } from "../src/lib/model.ts";
import { readSession } from "../src/lib/session.ts";
import { AUDIO_FORMATS } from "../shared/creator.ts";
const id = "eab8a6e2-0ac8-4615-9e0d-ebde30523783";
test("general search omits incompatible field terms and encodes user queries", () => {
  const p = serializeSearch({ form: { ...defaultForm, query: "wind & rain", creator: "ignored", title: "ignored" }, page: 1 });
  assert.equal(p.get("q"), "wind & rain");
  assert.equal(p.get("source"), "freesound");
  assert.equal(p.has("creator"), false);
  assert.equal(p.has("title"), false);
  assert.equal(p.has("unstable__sort_dir"), false);
  assert.equal(p.has("unstable__include_sensitive_results"), false);
  assert.equal(p.get("extension"), AUDIO_FORMATS.join(","));
});
test("format filtering allows only Creator formats and defaults to all supported formats", () => {
  const form = { ...defaultForm, query: "whoosh" };
  assert.equal(serializeSearch({ form: { ...form, extensions: ["m4a", "wav"] }, page: 1 }).get("extension"), "m4a,wav");
  for (const format of ["opus", "webm", "oga", "mid", "aiff"]) {
    assert.throws(() => serializeSearch({ form: { ...form, extensions: [format] }, page: 1 }), /Creator supports/);
    assert.throws(() => serializeSearch({ form: { ...form, customExtensions: format }, page: 1 }), /Creator supports/);
  }
});
test("independent specific fields never send q", () => {
  const p = serializeSearch({ form: { ...defaultForm, mode: "fields", query: "ignored", title: "water", creator: "a name", tags: "rain" }, page: 1 });
  assert.equal(p.has("q"), false); assert.equal(p.get("creator"), "a name"); assert.equal(p.get("tags"), "rain");
});
test("collections require exact identifiers and omit normal filters", () => {
  const form = { ...defaultForm, query: "ignored", licenses: ["cc0"], mature: true };
  const p = serializeSearch({ form, page: 2, collection: { kind: "tag", value: "Low-Quality", label: "tag" } });
  assert.equal(p.get("unstable__tag"), "Low-Quality"); assert.equal(p.has("license"), false); assert.equal(p.has("mature"), false); assert.equal(p.has("source"), false);
  assert.throws(() => serializeSearch({ form, page: 1, collection: { kind: "creator", value: "John", label: "John" } }), /source/);
});
test("conflicting sources, invalid boosts and pagination are rejected", () => {
  const form = { ...defaultForm, query: "rain" };
  assert.throws(() => serializeSearch({ form: { ...form, excludedSources: ["freesound"] }, page: 1 }), /included and excluded/);
  assert.throws(() => serializeSearch({ form: { ...form, authorityBoost: 11 }, page: 1 }), /boost/);
  assert.throws(() => serializeSearch({ form, page: 0 }), /Page/);
  assert.throws(() => serializeSearch({ form: { ...form, pageSize: 21 }, page: 1 }), /20/);
  assert.throws(() => serializeSearch({ form: { ...form, usage: ["all", "commercial"] }, page: 1 }), /All license/);
  assert.throws(() => serializeSearch({ form: { ...form, mature: true, sensitive: true }, page: 1 }), /not both/);
});
test("experimental controls and all standard filter groups serialize", () => {
  const p = serializeSearch({ form: { ...defaultForm, query: "rain", sources: [], excludedSources: ["jamendo"], licenses: ["by", "cc0"], usage: ["commercial", "modification"], categories: ["sound_effect"], lengths: ["shortest"], extensions: ["wav"], customExtensions: "MP3, wav", authority: true, authorityBoost: 2.5, sort: "indexed_on", direction: "asc", filterDead: false, sensitive: true }, page: 1 });
  assert.equal(p.get("source"), null); assert.equal(p.get("extension"), "wav,mp3");
  assert.equal(p.get("license_type"), "commercial,modification"); assert.equal(p.get("license"), "by,cc0");
  assert.equal(p.get("unstable__sort_dir"), "asc"); assert.equal(p.get("unstable__authority_boost"), "2.5");
  assert.equal(p.get("filter_dead"), "false"); assert.equal(p.get("unstable__include_sensitive_results"), "true");
  assert.equal(p.has("mature"), false);
});
test("nullable metadata, optional peaks and unsafe URLs are handled", () => {
  const a = normalizeAudio({ id, license: "cc0", title: null, category: null, duration: -1, tags: [{ name: "rain" }, { name: 1 }], peaks: { points: [0.5, 2, -1, "bad"] }, alt_files: [{ url: "javascript:alert(1)", filetype: "wav" }] });
  assert.equal(a.duration, undefined); assert.equal(a.tags?.length, 1); assert.deepEqual(a.peaks, [0.5, 1, 0]);
  assert.equal(a.alt_files?.[0].url, undefined); assert.equal(safeUrl("javascript:alert(1)"), undefined); assert.equal(safeUrl("https://example.org/file.mp3"), "https://example.org/file.mp3");
  assert.equal(time(null), "—"); assert.equal(time(65), "1:05"); assert.equal(time(3601), "1:00:01");
});
test("session import validates, deduplicates and preserves search defaults", () => {
  const a = { id, license: "cc0", title: "Rain" };
  const result = readSession(JSON.stringify({ version: 1, tracks: [a, a], searches: [{ name: "Rain", form: { ...defaultForm, query: "rain" } }] }));
  assert.equal(result.tracks.length, 1); assert.equal(result.searches[0].form.sources[0], "freesound");
  assert.throws(() => readSession('{"version":2,"tracks":[],"searches":[]}'), /supported/);
  assert.throws(() => readForm({ ...defaultForm, mode: "unknown" }), /mode/);
  assert.throws(() => readForm({ ...defaultForm, categories: ["invented"] }), /unsupported/);
});
