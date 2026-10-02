import { useMemo } from "react";
import { Bookmark, Pause, Play, LoaderCircle, ChevronRight, Volume2, Repeat2, X, Plus } from "lucide-react";
import { getPeaks, licenseName, safeUrl, sourceName, time, titleOf } from "../lib/model.ts";
import type { Audio } from "../lib/model.ts";
import type { Player } from "../lib/use-player.ts";
import { IconButton, External } from "./ui.tsx";

export function Waveform({ peaks, progress = 0, onSeek, label = "Seek audio", duration = 0 }: { peaks: number[]; progress?: number; onSeek?: (fraction: number) => void; label?: string; duration?: number }) {
  const bars = useMemo(() => {
    if (!peaks.length) return [];
    const count = 64;
    return Array.from({ length: count }, (_, i) => {
      const start = Math.floor(i * peaks.length / count), end = Math.max(start + 1, Math.floor((i + 1) * peaks.length / count));
      return Math.max(0.025, ...peaks.slice(start, end));
    });
  }, [peaks]);
  return <div className={"waveform " + (!bars.length ? "no-peaks" : "")}>
    <div className="waveform-bars" aria-hidden="true">{bars.map((value, i) => <span key={i} className={i / bars.length < progress ? "played" : ""} style={{ height: Math.max(2, value * 26) + "px" }} />)}{!bars.length && <span className="waveform-line" />}</div>
    {onSeek && <input type="range" aria-label={label} min={0} max={1000} value={Math.round(Math.min(1, progress) * 1000)} aria-valuetext={time(progress * duration)} onChange={(e) => onSeek(Number(e.target.value) / 1000)} />}
  </div>;
}
export function AudioRow({ audio, player, saved, onSave, onDetails, showSource = false, onAdd }: { audio: Audio; player: Player; saved: boolean; onSave: (a: Audio) => void; onDetails: (a: Audio) => void; showSource?: boolean; onAdd?: (a: Audio) => void }) {
  const active = player.current?.id === audio.id;
  const peaks = active ? getPeaks(player.current!) : getPeaks(audio);
  const seconds = active ? player.duration : (audio.duration || 0) / 1000;
  return <article className={"audio-row " + (active ? "active" : "")}>
    <div className="row-heading">
      <IconButton label={(active && player.playing ? "Pause " : "Play ") + titleOf(audio)} className="row-play" onClick={() => player.select(audio)} disabled={!safeUrl(audio.url)}>
        {active && player.buffering ? <LoaderCircle size={17} className="spin" /> : active && player.playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </IconButton>
      <button className="track-name" onClick={() => onDetails(audio)} title={titleOf(audio)}><strong>{titleOf(audio)}</strong><span>{audio.creator || "Unknown creator"}{showSource ? " · " + sourceName(audio.source) : ""}</span></button>
      <IconButton label={(saved ? "Unsave " : "Save ") + titleOf(audio)} aria-pressed={saved} className={saved ? "saved" : ""} onClick={() => onSave(audio)}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /></IconButton>
      {onAdd && <IconButton label={"Add " + titleOf(audio) + " to scene"} onClick={() => onAdd(audio)}><Plus size={15} /></IconButton>}
    </div>
    <div className="row-wave"><Waveform peaks={peaks} progress={active && seconds ? player.position / seconds : 0} duration={seconds} onSeek={seconds > 0 && safeUrl(audio.url) ? (f) => player.select(audio, active ? player.source() : audio.url, f * seconds, true) : undefined} label={"Seek " + titleOf(audio)} /><span className="time">{time(audio.duration == null ? null : audio.duration / 1000)}</span></div>
    <div className="row-meta"><span className={"license-badge " + (audio.license === "cc0" || audio.license === "pdm" ? "open-license" : "")}>{licenseName(audio.license)}</span>{audio.filetype && <span>{audio.filetype.toUpperCase()}</span>}{(audio.mature || audio.unstable__sensitivity?.length) ? <span className="sensitive-badge">Sensitive</span> : null}<button className="details-link" onClick={() => onDetails(audio)}>Details<ChevronRight size={11} /></button></div>
  </article>;
}
export function MiniPlayer({ player, onDetails }: { player: Player; onDetails: (a: Audio) => void }) {
  const a = player.current;
  if (!a) return null;
  return <footer className="mini-player" aria-label="Audio preview player">
    <div className="mini-top">
      <IconButton label={player.playing ? "Pause preview" : "Play preview"} className="mini-play" onClick={player.toggle}>{player.buffering ? <LoaderCircle size={16} className="spin" /> : player.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</IconButton>
      <button className="mini-title" onClick={() => onDetails(a)}><strong>{titleOf(a)}</strong><span>{a.creator || "Unknown creator"}</span></button>
      <IconButton label={player.volume ? "Mute preview" : "Unmute preview"} onClick={() => player.changeVolume(player.volume ? 0 : 1)}><Volume2 size={15} /></IconButton>
      <IconButton label={player.loop ? "Disable loop" : "Loop preview"} aria-pressed={player.loop} className={player.loop ? "selected" : ""} onClick={() => player.changeLoop(!player.loop)}><Repeat2 size={15} /></IconButton>
      <IconButton label="Close preview" onClick={player.close}><X size={14} /></IconButton>
    </div>
    <div className="player-seek"><span>{time(player.position)}</span><input type="range" aria-label="Preview position" min={0} max={Math.max(0, player.duration)} step={0.1} value={Math.min(player.position, player.duration)} onChange={(e) => player.seek(Number(e.target.value))} /><span>{time(player.duration)}</span><input className="volume-slider" aria-label="Preview volume" type="range" min={0} max={1} step={0.01} value={player.volume} onChange={(e) => player.changeVolume(Number(e.target.value))} /></div>
    {player.error && <div className="player-error" role="alert">{player.error} <External href={a.foreign_landing_url}>Source</External></div>}
  </footer>;
}
