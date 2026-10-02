import { useEffect, useState } from "react";
import { Button } from "@lottiefiles/creator-plugins-ui";
import { Plus } from "lucide-react";
import { AUDIO_FORMATS, MAX_AUDIO_BYTES } from "../../shared/creator.ts";
import type { AudioImport, CreatorContext } from "../../shared/creator.ts";
import { api } from "../lib/api.ts";
import { attributionOf, fileSize, safeUrl, titleOf } from "../lib/model.ts";
import type { Audio } from "../lib/model.ts";
import { creatorRequest } from "../lib/creator.ts";
import { ClientForm, ErrorNotice, External, Loading, Modal } from "./ui.tsx";

export function AddAudio({ initial, host, onClose, onAdded }: { initial: Audio; host: CreatorContext; onClose: () => void; onAdded: (message: string) => void }) {
  const [audio, setAudio] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [fileIndex, setFileIndex] = useState(0);
  const [placement, setPlacement] = useState<"playhead" | "start">("playhead");
  const [extendScene, setExtend] = useState(false);
  const [adding, setAdding] = useState(false), [error, setError] = useState("");
  const [context, setContext] = useState(host);
  useEffect(() => {
    let cancelled = false;
    void api.details(initial.id).then((data) => { if (!cancelled) setAudio(data); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    void creatorRequest<CreatorContext>("context").then((data) => { if (!cancelled) setContext(data); }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [initial.id]);
  const files = [audio, ...(audio.alt_files || [])].filter((file) => safeUrl(file.url) && AUDIO_FORMATS.includes((file.filetype || "").toLowerCase()) && (file.filesize == null || file.filesize <= MAX_AUDIO_BYTES));
  const file = files[fileIndex] || files[0];
  const scene = context.scene;
  async function add() {
    if (adding || host.importing || !file || !scene) return;
    setAdding(true); setError("");
    const input: AudioImport = { url: safeUrl(file.url)!, format: file.filetype!.toLowerCase(), filesize: file.filesize,
      provenance: { id: audio.id, title: titleOf(audio), creator: audio.creator || "", attribution: attributionOf(audio), sourceUrl: safeUrl(audio.foreign_landing_url) || "", licenseUrl: safeUrl(audio.license_url) || "", license: audio.license, mediaUrl: safeUrl(file.url)! },
      placement, inSeconds: 0, outSeconds: null, volume: 100, muted: false, extendScene, fadeIn: 0, fadeOut: 0 };
    try {
      const result = await creatorRequest<{ name: string; start: number; end: number; fps: number }>("import", input);
      onAdded("Added “" + result.name + "” at " + (result.start / result.fps).toFixed(2) + "s"); onClose();
    } catch (e) {
      const message = (e as Error).message;
      setError(message + (/clip|fades|scene|volume|processing|running/i.test(message) ? "" : " If the provider blocks access, choose another available file or sound."));
    }
    finally { setAdding(false); }
  }
  const length = (audio.duration || 0) / 1000;
  const beyondScene = !!scene && length > 0 && length + (placement === "playhead" ? scene.frame / scene.fps : 0) > scene.duration;
  return <Modal open onClose={() => { if (!adding) onClose(); }} title="Add sound to scene" description={titleOf(audio)}>
    {loading && <Loading label="Loading available files…" />}
    {!context.audioAvailable && <ErrorNotice message="This Creator version doesn't support audio plugins yet." />}
    {!scene && <ErrorNotice message="Open a scene in Creator to add this sound." />}
    {!loading && !files.length && <ErrorNotice message="No supported file under 20 MB is available. Check the original source or choose another sound." />}
    <ClientForm onAction={() => void add()}>
      <label className="field">Audio file<select aria-label="Audio file" value={fileIndex} onChange={(e) => setFileIndex(Number(e.target.value))} disabled={adding || loading}>{files.map((f, i) => <option key={i} value={i}>{f.filetype?.toUpperCase()} · {fileSize(f.filesize)}{f.url === audio.url ? " · Preview" : ""}</option>)}</select></label>
      <label className="field">Placement<select value={placement} disabled={adding} onChange={(e) => setPlacement(e.target.value as typeof placement)}><option value="playhead">At current playhead</option><option value="start">At scene start</option></select></label>
      {scene && <p className="field-hint">{scene.name} · {scene.fps} fps · {scene.duration.toFixed(2)}s. Playhead: {(scene.frame / scene.fps).toFixed(2)}s.</p>}
      <label className="check-option"><input type="checkbox" checked={extendScene} disabled={adding} onChange={(e) => setExtend(e.target.checked)} />Extend scene to fit</label>
      {beyondScene && !extendScene && <p className="field-hint">Part of this clip is beyond the scene's end. Extend the scene to hear the entire clip.</p>}
      <p className="field-hint">Trim and adjust volume or fades in Creator after adding.</p>
      <p className="field-hint">MP3, WAV, M4A, FLAC and OGG · up to 20 MB. Attribution stays with the layer.</p>
      <External href={audio.license_url}>Review {audio.license.toUpperCase()} license</External>
      {error && <ErrorNotice message={error} />}
      <div className="dialog-actions"><Button type="button" variant="ghost" size="sm" disabled={adding} onClick={onClose}>Cancel</Button><Button type="submit" size="sm" loading={adding} disabled={adding || host.importing || loading || !file || !scene || !context.audioAvailable}><Plus size={14} />{adding || host.importing ? "Adding audio…" : "Add to scene"}</Button></div>
    </ClientForm>
  </Modal>;
}
