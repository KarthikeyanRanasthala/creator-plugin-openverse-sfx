import { useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import { getPeaks, safeUrl } from "./model.ts";
import type { Audio } from "./model.ts";

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekOnLoad = useRef(0);
  const [current, setCurrent] = useState<Audio>();
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState("");
  function start() {
    const audio = audioRef.current;
    if (!audio?.src) return;
    const src = audio.src;
    void audio.play().catch(() => {
      if (audio.src === src) { setBuffering(false); setError("Preview unavailable. Try another format or open the source."); }
    });
  }
  function toggle() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) start(); else audioRef.current.pause();
  }
  function select(track: Audio, url = track.url, seconds = 0, forcePlay = false) {
    const src = safeUrl(url);
    const audio = audioRef.current;
    if (!src || !audio) { setError("This sound has no playable file. Open its source for available formats."); return; }
    setError("");
    if (audio.dataset.trackId === track.id && audio.src === src) {
      if (forcePlay) { audio.currentTime = seconds; setPosition(seconds); start(); } else toggle();
      return;
    }
    audio.pause();
    audio.dataset.trackId = track.id;
    audio.src = src;
    seekOnLoad.current = seconds;
    setCurrent(track); setPosition(seconds); setDuration((track.duration || 0) / 1000); setBuffering(true);
    audio.load(); start();
    if (!getPeaks(track).length) void api.waveform(track.id).then((peaks) => {
      setCurrent((a) => a?.id === track.id ? { ...a, peaks } : a);
    }).catch(() => { /* Playback remains usable without peaks. */ });
  }
  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = Math.max(0, Math.min(value, duration || 0)); setPosition(audio.currentTime);
  }
  function changeVolume(value: number) { if (audioRef.current) audioRef.current.volume = value; setVolume(value); }
  function changeLoop(value: boolean) { if (audioRef.current) audioRef.current.loop = value; setLoop(value); }
  function close() { audioRef.current?.pause(); audioRef.current?.removeAttribute("src"); audioRef.current?.load(); setCurrent(undefined); setError(""); setBuffering(false); }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, button, a, [role=dialog]"))) return;
      const audio = audioRef.current;
      if (!audio?.src) return;
      if (event.code === "Space") { event.preventDefault(); if (audio.paused) void audio.play().catch(() => setError("Preview unavailable.")); else audio.pause(); }
      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : 0, audio.currentTime + (event.code === "ArrowLeft" ? -5 : 5)));
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return {
    audioRef, current, playing, buffering, position, duration, volume, loop, error,
    source: () => audioRef.current?.src,
    select, toggle, seek, changeVolume, changeLoop, close,
    events: {
      onPlay: () => setPlaying(true), onPause: () => setPlaying(false),
      onWaiting: () => setBuffering(true), onPlaying: () => { setBuffering(false); setError(""); },
      onCanPlay: () => setBuffering(false), onEnded: () => { setPlaying(false); setBuffering(false); },
      onError: () => { if (audioRef.current?.getAttribute("src")) { setError("Preview unavailable. Try another format or open the source."); setBuffering(false); setPlaying(false); } },
      onTimeUpdate: () => setPosition(audioRef.current?.currentTime || 0),
      onLoadedMetadata: () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (Number.isFinite(audio.duration)) setDuration(audio.duration);
        if (seekOnLoad.current) { audio.currentTime = seekOnLoad.current; seekOnLoad.current = 0; }
      },
    },
  };
}
export type Player = Omit<ReturnType<typeof usePlayer>, "audioRef" | "events">;
