import { useEffect, useState } from "react";
import { Button, Input } from "@lottiefiles/creator-plugins-ui";
import { ArrowLeft, Bookmark, Copy, Download, Flag, Play, RefreshCw, Search, Image, ChevronRight } from "lucide-react";
import { api } from "../lib/api.ts";
import { API_BASE, attributionOf, fileSize, getPeaks, licenseName, safeUrl, sourceName, time, titleOf } from "../lib/model.ts";
import type { Audio, AudioFile, Collection } from "../lib/model.ts";
import type { Player } from "../lib/use-player.ts";
import { isEmbeddedPanel } from "../lib/browser.ts";
import { AudioRow, Waveform } from "./audio-row.tsx";
import { ClientForm, ErrorNotice, External, IconButton, LinkDialog, Loading, Modal } from "./ui.tsx";

export function Detail({ initial, player, saved, onSave, onBack, onCollection, onDetails, isSaved, notify }: {
  initial: Audio; player: Player; saved: boolean; onSave: (a: Audio) => void; onBack: () => void;
  onCollection: (c: Collection) => void; onDetails: (a: Audio) => void; isSaved: (a: Audio) => boolean; notify: (message: string) => void;
}) {
  const [audio, setAudio] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [related, setRelated] = useState<Audio[]>();
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState("");
  const [fullSize, setFullSize] = useState(false);
  const [compression, setCompression] = useState("default");
  const [artFailed, setArtFailed] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [fileLink, setFileLink] = useState("");
  // The parent keys this view by UUID; a late request cannot update a different track.
  useEffect(() => {
    let cancelled = false;
    void api.details(initial.id).then((value) => { if (!cancelled) setAudio(value); }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [initial.id]);
  async function refresh() {
    setLoading(true); setError("");
    try { setAudio(await api.details(audio.id, true)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); notify("Copied to clipboard"); }
    catch { setCopyFallback(value); }
  }
  async function download(file: AudioFile) {
    const url = safeUrl(file.url);
    if (!url) return;
    if (isEmbeddedPanel()) { setFileLink(url); return; }
    // Avoid buffering unknown or large remote files in a small plugin.
    if (file.filesize == null || file.filesize > 25 * 1024 * 1024) { notify("Use Open file or Original source to download this format."); return; }
    setDownloading(url);
    try {
      const response = await fetch(url, { credentials: "omit", signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (blob.size > 25 * 1024 * 1024) throw new Error();
      if (!blob.type.startsWith("audio/") && !blob.type.startsWith("application/octet-stream") && !blob.type.startsWith("video/")) throw new Error();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = objectUrl; a.download = titleOf(audio).replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 100) + "." + (file.filetype?.replace(/[^a-z0-9]/gi, "") || "audio"); a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      notify("Download started");
    } catch { notify("This provider doesn't allow direct downloads here. Use Open file or Original source."); }
    finally { setDownloading(""); }
  }
  const active = player.current?.id === audio.id;
  const peaks = active ? getPeaks(player.current!) : getPeaks(audio);
  const seconds = active ? player.duration : (audio.duration || 0) / 1000;
  const artQuery = new URLSearchParams({ full_size: String(fullSize) });
  if (compression !== "default") artQuery.set("compressed", compression);
  const artwork = safeUrl(audio.thumbnail) ? API_BASE + "audio/" + audio.id + "/thumb/?" + artQuery : undefined;
  return <div className="detail-view">
    <div className="detail-navigation"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} />Back to sounds</Button><IconButton label={saved ? "Unsave sound" : "Save sound"} className={saved ? "saved" : ""} aria-pressed={saved} onClick={() => onSave(audio)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></IconButton></div>
    <div className="detail-heading"><div className="artwork">{artwork && !artFailed ? <img src={artwork} alt={"Artwork for " + titleOf(audio)} onError={() => setArtFailed(true)} /> : <Image size={23} />}</div><div><h1>{titleOf(audio)}</h1><External href={audio.creator_url}>{audio.creator || "Unknown creator"}</External><div className="detail-badges"><span className="license-badge open-license">{licenseName(audio.license)} {audio.license_version}</span>{audio.mature || audio.unstable__sensitivity?.length ? <span className="sensitive-badge">Sensitive</span> : null}</div></div></div>
    <div className="detail-preview"><Waveform peaks={peaks} progress={active && seconds ? player.position / seconds : 0} duration={seconds} onSeek={seconds && safeUrl(audio.url) ? (f) => player.select(audio, active ? player.source() : audio.url, f * seconds, true) : undefined} /><div className="split"><Button size="sm" onClick={() => player.select(audio)} disabled={!safeUrl(audio.url)}><Play size={13} />{active && player.playing ? "Pause preview" : "Preview sound"}</Button><span className="time">{time(audio.duration == null ? null : audio.duration / 1000)}</span></div></div>
    {error && <ErrorNotice message={error} action={refresh} />}
    <section className="detail-section"><h2>About this sound</h2><dl className="metadata">
      {[
        ["Source", sourceName(audio.source)], ["Provider", sourceName(audio.provider)], ["Format", audio.filetype?.toUpperCase() || "—"],
        ["File size", fileSize(audio.filesize)], ["Bitrate", audio.bit_rate == null ? "—" : Math.round(audio.bit_rate / 1000) + " kbps"],
        ["Sample rate", audio.sample_rate == null ? "—" : audio.sample_rate / 1000 + " kHz"],
        ["Category", audio.category?.replaceAll("_", " ") || "Uncategorized"],
        ["Genres", audio.genres?.join(", ") || "—"],
        ["Indexed", audio.indexed_on && Number.isFinite(Date.parse(audio.indexed_on)) ? new Date(audio.indexed_on).toLocaleDateString() : "—"],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl><div className="detail-links"><External href={audio.foreign_landing_url}>Original source</External><External href={audio.license_url}>License terms</External></div>
    <div className="collection-actions">{audio.source && <Button variant="outline" size="sm" onClick={() => onCollection({ kind: "source", value: audio.source!, label: sourceName(audio.source) })}>More from this source<ChevronRight size={12} /></Button>}{audio.creator && audio.source && <Button variant="outline" size="sm" onClick={() => onCollection({ kind: "creator", value: audio.creator!, source: audio.source!, label: audio.creator! })}>More by this creator<ChevronRight size={12} /></Button>}</div></section>
    <section className="detail-section"><h2>Attribution</h2><p className="attribution">{attributionOf(audio)}</p><div className="button-row"><Button variant="outline" size="sm" onClick={() => void copy(attributionOf(audio))}><Copy size={13} />Copy attribution</Button><Button variant="ghost" size="sm" onClick={() => void copy("https://openverse.org/audio/" + audio.id)}>Copy link</Button></div></section>
    {!!audio.tags?.length && <section className="detail-section"><h2>Explore tags</h2><div className="tags">{audio.tags.map((t, i) => <button key={t.name + i} className="tag" title={(t.unstable__provider || "Unknown provider") + (t.accuracy != null ? " · accuracy " + t.accuracy : "")} onClick={() => onCollection({ kind: "tag", value: t.name, label: t.name })}>{t.name}</button>)}</div></section>}
    {audio.audio_set && <section className="detail-section"><h2>Audio set</h2><p>{audio.audio_set.title || "Untitled set"}</p><External href={audio.audio_set.foreign_landing_url}>View audio set</External></section>}
    <section className="detail-section"><h2>Available files</h2>{[audio, ...(audio.alt_files || [])].filter((f) => safeUrl(f.url)).map((f, i) => <div className="file-row" key={i}><div><strong>{f.filetype?.toUpperCase() || "Audio"}{i === 0 ? " · Preview" : ""}</strong><span>{fileSize(f.filesize)}{f.sample_rate != null ? " · " + f.sample_rate / 1000 + " kHz" : ""}{f.bit_rate ? " · " + Math.round(f.bit_rate / 1000) + " kbps" : ""}</span><External href={f.url}>Open file</External></div><IconButton label={"Preview " + (f.filetype || "audio") + " file"} onClick={() => player.select(audio, f.url)}><Play size={14} /></IconButton><IconButton label={"Download " + (f.filetype || "audio") + " file"} disabled={!!downloading} onClick={() => void download(f)}><Download size={14} /></IconButton></div>)}<p className="field-hint">Some original files require a provider account. Openverse search and available previews are anonymous.</p></section>
    <section className="detail-section"><div className="split"><h2>Related sounds</h2><Button variant="ghost" size="sm" disabled={relatedLoading} onClick={() => {
      setRelatedLoading(true); setRelatedError("");
      void api.related(audio.id, !!related).then((p) => setRelated(p.results)).catch((e: Error) => setRelatedError(e.message)).finally(() => setRelatedLoading(false));
    }}><Search size={13} />{related ? "Refresh" : "Find related"}</Button></div>{relatedLoading && <Loading label="Finding related sounds…" />}{relatedError && <ErrorNotice message={relatedError} />}{related?.length === 0 && <p className="field-hint">No related sounds were returned.</p>}{related?.map((a) => <AudioRow key={a.id} audio={a} player={player} saved={isSaved(a)} onSave={onSave} onDetails={onDetails} showSource />)}</section>
    <details className="advanced detail-section"><summary>Artwork & metadata</summary><div className="field-row"><label className="check-option"><input type="checkbox" checked={fullSize} onChange={(e) => { setFullSize(e.target.checked); setArtFailed(false); }} />Original artwork size</label><label className="field">Compression<select value={compression} onChange={(e) => { setCompression(e.target.value); setArtFailed(false); }}><option value="default">Default</option><option value="true">Compressed</option><option value="false">Uncompressed</option></select></label></div><External href={artwork}>Open artwork</External><p className="field-hint">Matched fields: {audio.fields_matched?.join(", ") || "—"}</p>{!!audio.unstable__sensitivity?.length && <p className="field-hint">Sensitivity metadata: {JSON.stringify(audio.unstable__sensitivity)}</p>}<Button variant="ghost" size="sm" loading={loading} onClick={() => void refresh()}><RefreshCw size={13} />Refresh details</Button><pre className="raw-metadata">{JSON.stringify(audio, null, 2)}</pre></details>
    <Button className="report-button" variant="ghost" size="sm" onClick={() => setReportOpen(true)}><Flag size={13} />Report this sound</Button>
    {reportOpen && <Report audio={audio} onClose={() => setReportOpen(false)} notify={notify} />}
    {fileLink && <LinkDialog url={fileLink} onClose={() => setFileLink("")} />}
    {copyFallback && <Modal open onClose={() => setCopyFallback("")} title="Copy text" description="Clipboard access isn't available here. Select and copy this text."><textarea className="copy-text" value={copyFallback} readOnly aria-label="Text to copy" onFocus={(e) => e.target.select()} /></Modal>}
  </div>;
}
function Report({ audio, onClose, notify }: { audio: Audio; onClose: () => void; notify: (text: string) => void }) {
  const [reason, setReason] = useState<"mature" | "dmca" | "other">("other");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  return <Modal open onClose={() => { if (!sending) onClose(); }} title="Report this sound" description={"Send a report to Openverse about “" + titleOf(audio) + "”."}>
    <ClientForm onAction={() => { if (sending) return; setSending(true); setError(""); void api.report(audio.id, reason, description).then(() => { notify("Report sent to Openverse"); onClose(); }).catch((err: Error) => setError(err.message)).finally(() => setSending(false)); }}>
      <label className="field">Reason<select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}><option value="other">Other issue</option><option value="mature">Mature or sensitive content</option><option value="dmca">Copyright concern</option></select></label>
      <label className="field">Description<textarea maxLength={500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label><p className="field-hint">{description.length}/500 characters</p>
      <label className="field">Sound identifier<Input value={audio.id} readOnly /></label>
      {error && <ErrorNotice message={error} />}
      <div className="dialog-actions"><Button variant="ghost" size="sm" disabled={sending} type="button" onClick={onClose}>Cancel</Button><Button type="submit" size="sm" loading={sending}>Send report</Button></div>
    </ClientForm>
  </Modal>;
}
