import { useEffect, useRef, useState } from "react";
import type { Audio, SavedSearch } from "./model.ts";
import { readSession } from "./session.ts";
import { creatorRequest } from "./creator.ts";
import { isEmbeddedPanel } from "./browser.ts";

export function useLibrary(connected: boolean) {
  const [favorites, setFavorites] = useState<Audio[]>([]);
  // Retain existing saved searches in storage for compatibility, without exposing
  // search-saving or import/export controls in the simplified plugin.
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loaded, setLoaded] = useState(!isEmbeddedPanel());
  const [status, setStatus] = useState<"loading" | "saved" | "saving" | "session" | "error">(isEmbeddedPanel() ? "loading" : "session");
  const [error, setError] = useState("");
  const lastSaved = useRef("");
  const hydrated = useRef(false);
  const writes = useRef(Promise.resolve());
  const serialized = JSON.stringify({ version: 1, tracks: favorites.map((a) => ({ ...a, peaks: [] })), searches: savedSearches });
  useEffect(() => {
    if (!connected || hydrated.current) return;
    let cancelled = false;
    void creatorRequest<string | undefined>("load").then((text) => {
      if (cancelled) return;
      const library = text ? readSession(text) : { tracks: [], searches: [] };
      lastSaved.current = JSON.stringify({ version: 1, tracks: library.tracks.map((a) => ({ ...a, peaks: [] })), searches: library.searches });
      setFavorites(library.tracks); setSavedSearches(library.searches); setStatus("saved"); setError(""); hydrated.current = true; setLoaded(true);
    }).catch((e: Error) => { if (!cancelled) { setError("Couldn't restore saved sounds: " + e.message + " Reopen the plugin to try again. New choices will only last for this session."); setStatus("error"); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [connected]);
  useEffect(() => {
    if (!connected || !loaded || !hydrated.current || serialized === lastSaved.current) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setStatus("saving");
      const write = writes.current.then(() => creatorRequest("save", serialized));
      writes.current = write.then(() => {}, () => {});
      void write.then(() => { lastSaved.current = serialized; if (!cancelled) { setStatus("saved"); setError(""); } }).catch((e: Error) => { if (!cancelled) { setStatus("error"); setError("Your sounds haven't been saved: " + e.message + " Reopen the plugin to restore saved items."); } });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [connected, loaded, serialized]);
  return { favorites, setFavorites, loaded, status, error };
}
