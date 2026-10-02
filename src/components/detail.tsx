import { useEffect, useState } from "react";
import { Button } from "@lottiefiles/creator-plugins-ui";
import { ArrowLeft, Bookmark, Copy, Play, Image, Plus } from "lucide-react";
import { api } from "../lib/api.ts";
import { attributionOf, fileSize, getPeaks, licenseName, safeUrl, sourceName, time, titleOf } from "../lib/model.ts";
import type { Audio } from "../lib/model.ts";
import type { Player } from "../lib/use-player.ts";
import { Waveform } from "./audio-row.tsx";
import { ErrorNotice, External, IconButton, Modal } from "./ui.tsx";

export function Detail({ initial, player, saved, onSave, onBack, notify, onAdd }: {
  initial: Audio; player: Player; saved: boolean; onSave: (a: Audio) => void; onBack: () => void;
  notify: (message: string) => void; onAdd?: (a: Audio) => void;
}) {
  const [audio, setAudio] = useState(initial);
  const [error, setError] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const [artFailed, setArtFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void api.details(initial.id).then((value) => { if (!cancelled) setAudio(value); }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [initial.id]);
  async function copy() {
    try { await navigator.clipboard.writeText(attributionOf(audio)); notify("Attribution copied"); }
    catch { setCopyFallback(attributionOf(audio)); }
  }
  const active = player.current?.id === audio.id;
  const peaks = active ? getPeaks(player.current!) : getPeaks(audio);
  const seconds = active ? player.duration : (audio.duration || 0) / 1000;
  return <div className="detail-view">
    <div className="detail-navigation"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} />Back to sounds</Button><IconButton label={saved ? "Unsave sound" : "Save sound"} className={saved ? "saved" : ""} aria-pressed={saved} onClick={() => onSave(audio)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></IconButton></div>
    <div className="detail-heading"><div className="artwork">{safeUrl(audio.thumbnail) && !artFailed ? <img src={safeUrl(audio.thumbnail)} alt={"Artwork for " + titleOf(audio)} onError={() => setArtFailed(true)} /> : <Image size={23} />}</div><div><h1>{titleOf(audio)}</h1><External href={audio.creator_url}>{audio.creator || "Unknown creator"}</External><div className="detail-badges"><span className="license-badge open-license">{licenseName(audio.license)} {audio.license_version}</span></div></div></div>
    <div className="detail-preview"><Waveform peaks={peaks} progress={active && seconds ? player.position / seconds : 0} duration={seconds} onSeek={seconds && safeUrl(audio.url) ? (f) => player.select(audio, active ? player.source() : audio.url, f * seconds, true) : undefined} /><div className="split"><Button size="sm" onClick={() => player.select(audio)} disabled={!safeUrl(audio.url)}><Play size={13} />{active && player.playing ? "Pause preview" : "Preview sound"}</Button><span className="time">{time(audio.duration == null ? null : audio.duration / 1000)}</span></div></div>
    {onAdd && <Button className="add-to-scene" size="sm" onClick={() => onAdd(audio)}><Plus size={14} />Add to scene</Button>}
    {error && <ErrorNotice message={error} />}
    <section className="detail-section"><h2>Sound details</h2><dl className="metadata">{[
      ["Source", sourceName(audio.source)], ["Format", audio.filetype?.toUpperCase() || "—"],
      ["Duration", time(audio.duration == null ? null : audio.duration / 1000)], ["File size", fileSize(audio.filesize)],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="detail-links"><External href={audio.foreign_landing_url}>Original source</External><External href={audio.license_url}>License terms</External></div></section>
    <section className="detail-section"><h2>Attribution</h2><p className="attribution">{attributionOf(audio)}</p><Button variant="outline" size="sm" onClick={() => void copy()}><Copy size={13} />Copy attribution</Button></section>
    {copyFallback && <Modal open onClose={() => setCopyFallback("")} title="Copy attribution" description="Select and copy this text."><textarea className="copy-text" value={copyFallback} readOnly aria-label="Attribution to copy" onFocus={(e) => e.target.select()} /></Modal>}
  </div>;
}
