import type { AudioLayer, CreatorAPI } from "@lottiefiles/creator-api-types";
import { clipFrames, isWebUrl, LIBRARY_KEY, parseImport, PROVENANCE_KEY, provenanceJson } from "../shared/creator.ts";
import type { CreatorContext, HostReply, Provenance } from "../shared/creator.ts";

export function createRuntime(api: CreatorAPI) {
  let ready = false, audioAvailable = false, importing = false;
  function context(): CreatorContext {
    const scene = api.activeScene;
    const layer = api.selection.nodes.find((node): node is AudioLayer => node.type === "AUDIO_LAYER");
    let provenance: Provenance | undefined;
    try { const text = layer?.data.get(PROVENANCE_KEY); if (text) provenance = JSON.parse(text) as Provenance; } catch { /* Other plugins may store incompatible data. */ }
    return { connected: true, audioAvailable, importing,
      scene: scene ? { id: scene.id, name: scene.name, fps: scene.framerate, duration: scene.duration, frame: api.timeline.currentFrame } : undefined,
      selectedAudio: layer ? { id: layer.id, name: layer.name, volume: layer.volume.getValueAt(), muted: layer.muted, start: layer.startFrame, end: layer.endFrame, offset: layer.timelineOffset, provenance } : undefined };
  }
  function publish() { if (ready) api.ui.postMessage({ type: "openverse:state", value: context() }); }
  // Registration is validated by the host. Events fire on changes, not on
  // subscription, so an empty scene must not wait for its first sound to enable Add.
  try { api.on("change:audio", publish); audioAvailable = true; } catch { audioAvailable = false; }
  api.on("selection:nodes", publish);
  api.on("change:scenes", publish);

  async function importAudio(value: unknown) {
    if (!audioAvailable) throw new Error("This Creator version doesn't support audio plugins yet.");
    if (importing) throw new Error("An audio import is already running. Please wait for it to finish.");
    const input = parseImport(value);
    const scene = api.activeScene;
    if (!scene) throw new Error("Open a scene in Creator before adding audio.");
    const frame = api.timeline.currentFrame, fps = scene.framerate;
    const existingAssets = new Set(api.assets.map((asset) => asset.id));
    importing = true;
    publish();
    let layer: AudioLayer | undefined;
    try {
      layer = await scene.import({ type: "AUDIO", url: input.url });
      if (api.activeScene?.id !== scene.id) throw new Error("The active scene changed during import. Return to your intended scene and try again.");
      const sceneStart = layer.startFrame;
      const duration = await layer.audio.getDuration() ?? (layer.endFrame - sceneStart) / fps;
      if (api.activeScene?.id !== scene.id || scene.framerate !== fps) throw new Error("The scene or frame rate changed during import. Return to your intended scene and try again.");
      const clip = clipFrames(input, duration, fps, sceneStart, frame);
      if (layer.endFrame < clip.end) layer.endFrame = clip.end;
      if (layer.startFrame !== clip.start) layer.startFrame = clip.start;
      if (layer.endFrame !== clip.end) layer.endFrame = clip.end;
      if (layer.timelineOffset !== clip.offset) layer.timelineOffset = clip.offset;
      layer.name = input.provenance.title.slice(0, 160) || "Openverse audio";
      if (layer.volume.staticValue !== input.volume) layer.volume.staticValue = input.volume;
      if (layer.muted !== input.muted) layer.muted = input.muted;
      if (clip.fadeIn || clip.fadeOut) {
        const keys = [{ frame: clip.start, value: clip.fadeIn ? 0 : input.volume }];
        if (clip.fadeIn) keys.push({ frame: clip.start + clip.fadeIn, value: input.volume });
        if (clip.fadeOut) keys.push({ frame: clip.end - clip.fadeOut, value: input.volume }, { frame: clip.end, value: 0 });
        layer.volume.addKeyframes([...new Map(keys.map((key) => [key.frame, key])).values()]);
      }
      layer.data.set(PROVENANCE_KEY, provenanceJson(input.provenance));
      if (input.extendScene && clip.end > sceneStart + scene.duration * fps) scene.duration = (clip.end - sceneStart) / fps;
      api.selection.nodes = [layer];
      publish();
      return { layerId: layer.id, name: layer.name, start: clip.start, end: clip.end, fps, duration, context: context() };
    } catch (error) {
      if (layer) {
        try { if (existingAssets.has(layer.audio.id)) layer.remove(); else layer.audio.remove(); }
        catch { layer.remove(); }
      }
      throw error;
    } finally { importing = false; publish(); }
  }
  return async function handle(message: unknown) {
    if (!message || typeof message !== "object") return;
    const { type, id, value } = message as { type?: string; id?: string; value?: unknown };
    if (typeof type !== "string" || !type.startsWith("openverse:") || typeof id !== "string" || id.length > 100) return;
    const reply: HostReply = { type: "openverse:reply", id, ok: true };
    try {
      switch (type) {
        case "openverse:ready": ready = true; reply.value = context(); publish(); break;
        case "openverse:context": reply.value = context(); break;
        case "openverse:import": reply.value = await importAudio(value); break;
        case "openverse:link": if (!isWebUrl(value)) throw new Error("Invalid web link."); api.openLink(value); break;
        case "openverse:load": reply.value = await api.clientStorage.get(LIBRARY_KEY); break;
        case "openverse:save": {
          if (typeof value !== "string" || value.length > 2_000_000) throw new Error("Your saved library exceeds the 2 MB limit. Export or remove items.");
          const data = JSON.parse(value) as { version?: number; tracks?: unknown[]; searches?: unknown[] };
          if (data?.version !== 1 || !Array.isArray(data.tracks) || !Array.isArray(data.searches) || data.tracks.length > 500 || data.searches.length > 100) throw new Error("Invalid saved library.");
          await api.clientStorage.set(LIBRARY_KEY, value); break;
        }
        default: return;
      }
    } catch (error) { reply.ok = false; reply.error = error instanceof Error ? error.message : String(error); }
    api.ui.postMessage(reply);
  };
}
