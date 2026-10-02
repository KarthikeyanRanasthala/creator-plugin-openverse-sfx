import { useLayoutEffect, useRef, useState } from "react";
import { Button, Input } from "@lottiefiles/creator-plugins-ui";
import { AudioLines, ArrowRight, Bookmark, Check, ChevronDown, CircleHelp, Compass, Home, Search, SlidersHorizontal, Sparkles, Waves, Wind, Zap, MousePointer2, Footprints, Droplets, Music2, X } from "lucide-react";
import { api, ApiError } from "./lib/api.ts";
import { defaultForm, filterChips, serializeSearch, sourceName, starterSources } from "./lib/model.ts";
import type { Audio, AudioPage, SearchForm, SearchRequest, Source } from "./lib/model.ts";
import { usePlayer } from "./lib/use-player.ts";
import { refreshCreator, useCreator } from "./lib/creator.ts";
import { useLibrary } from "./lib/use-library.ts";
import { AddAudio } from "./components/add-audio.tsx";
import { AudioRow, MiniPlayer } from "./components/audio-row.tsx";
import { Detail } from "./components/detail.tsx";
import { Filters } from "./components/filters.tsx";
import { ClientForm, Empty, ErrorNotice, External, IconButton, Loading, Modal } from "./components/ui.tsx";

const suggestions = [
  { query: "whoosh", title: "Whooshes", hint: "Swishes & transitions", icon: Wind },
  { query: "impact", title: "Impacts", hint: "Hits & cinematic booms", icon: Zap },
  { query: "click", title: "Interface", hint: "Clicks, pops & notifications", icon: MousePointer2 },
  { query: "ambience", title: "Ambience", hint: "Spaces & atmospheres", icon: Waves },
  { query: "footsteps", title: "Footsteps", hint: "Movement & textures", icon: Footprints },
  { query: "water", title: "Nature", hint: "Water, rain & wildlife", icon: Droplets },
  { query: "sci-fi", title: "Sci-fi", hint: "Futuristic & electronic", icon: Sparkles },
  { query: "music", title: "Music", hint: "Melodies & loops", icon: Music2 },
];

export const App = () => {
  const [form, setForm] = useState<SearchForm>({ ...defaultForm });
  const [request, setRequest] = useState<SearchRequest>();
  const [shownRequest, setShownRequest] = useState<SearchRequest>();
  const [response, setResponse] = useState<AudioPage>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [view, setView] = useState<"explore" | "saved">("explore");
  const host = useCreator();
  const library = useLibrary(host.connected);
  const { favorites, setFavorites } = library;
  const [addAudio, setAddAudio] = useState<Audio>();
  const [sceneAudioOpen, setSceneAudioOpen] = useState(false);
  const [detail, setDetail] = useState<Audio>();
  const [sources, setSources] = useState<Source[]>(starterSources);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [modal, setModal] = useState<"filters" | "help" | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const scroll = useRef<HTMLElement>(null);
  const scrollPosition = useRef(0);
  const { audioRef, events, ...player } = usePlayer();
  const chips = filterChips(form);

  function notify(message: string) {
    clearTimeout(toastTimer.current); setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  async function search(nextForm: SearchForm, page = 1, append = false) {
    const next = { form: nextForm, page };
    try { serializeSearch(next); } catch (e) { setError((e as Error).message); return; }
    const id = ++generation.current;
    setRequest(next); setLoading(true); setError(""); setView("explore"); setDetail(undefined);
    if (!append) scrollPosition.current = 0;
    try {
      const result = await api.search(next);
      if (id !== generation.current) return;
      setResponse((previous) => append && previous ? { ...result, results: [...new Map([...previous.results, ...result.results].map((a) => [a.id, a])).values()] } : result);
      setShownRequest(next); setCooldown(0);
      if (!append && scroll.current) scroll.current.scrollTop = 0;
    } catch (e) {
      if (id !== generation.current) return;
      setError((e as Error).message);
      if (e instanceof ApiError) setCooldown(e.retryAt);
    } finally { if (id === generation.current) setLoading(false); }
  }
  function goHome() {
    ++generation.current;
    setForm({ ...defaultForm, sources: form.sources });
    setRequest(undefined); setShownRequest(undefined); setResponse(undefined); setDetail(undefined);
    setLoading(false); setError(""); setCooldown(0); setView("explore");
    scrollPosition.current = 0;
    if (scroll.current) scroll.current.scrollTop = 0;
  }
  async function loadSources() {
    if (sourcesLoaded) return;
    setSourcesLoaded(true);
    try { const data = await api.sources(); if (data.length) setSources(data); }
    catch { /* Known choices remain available if the catalog cannot be loaded. */ }
  }
  function saveAudio(a: Audio) {
    if (!library.loaded) { notify("Your saved sounds are still loading."); return; }
    if (!favorites.some((s) => s.id === a.id) && favorites.length >= 500) { notify("You have 500 saved sounds. Remove some before adding more."); return; }
    setFavorites((list) => list.some((s) => s.id === a.id) ? list.filter((s) => s.id !== a.id) : [...list, a]);
  }
  function openDetails(a: Audio) {
    if (!detail) scrollPosition.current = scroll.current?.scrollTop || 0;
    setDetail(a);
  }
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = detail ? 0 : scrollPosition.current;
  }, [detail]);
  function changeSource(value: string) {
    const next = { ...form, sources: value === "all" ? [] : [value] };
    setForm(next);
    if (request) void search(next);
  }
  const isSaved = (a: Audio) => favorites.some((s) => s.id === a.id);
  const scopeLabel = shownRequest?.form.sources.length === 1 ? sourceName(shownRequest.form.sources[0]) : "Openverse";
  return <div className="plugin-shell">
    <header className="plugin-header"><div className="brand"><div className="brand-icon"><AudioLines size={19} /></div><div><h1>Openverse <span>Sounds</span></h1><span className="brand-caption">Find a sound. Bring it to your scene.</span></div></div><div className="header-actions">{(request || detail || view === "saved") && <IconButton label="Back to sound ideas" onClick={goHome}><Home size={16} /></IconButton>}<IconButton label="Help" onClick={() => setModal("help")}><CircleHelp size={17} /></IconButton></div></header>
    <div className="primary-tabs" role="tablist" aria-label="Library view">
      <button role="tab" aria-selected={view === "explore"} aria-controls="library-content" id="explore-tab" className={view === "explore" ? "active" : ""} onClick={() => { setView("explore"); setDetail(undefined); }}><Compass size={14} />Explore</button>
      <button role="tab" aria-selected={view === "saved"} aria-controls="library-content" id="saved-tab" className={view === "saved" ? "active" : ""} onClick={() => { setView("saved"); setDetail(undefined); scrollPosition.current = 0; }}><Bookmark size={14} />Saved{favorites.length > 0 && <span className="tab-count">{favorites.length}</span>}</button>
      <div className="source-picker"><span className="source-dot" /><select aria-label="Audio source" value={form.sources[0] || "all"} onFocus={() => void loadSources()} onChange={(e) => changeSource(e.target.value)}><option value="all">All sources</option>{sources.map((s) => <option key={s.source_name} value={s.source_name}>{s.display_name}</option>)}</select></div>
    </div>
    {view === "explore" && !detail && <div className="search-area">
      <ClientForm onAction={() => void search(form)}>
        <div className="search-box"><Search size={16} /><Input aria-label="Search sounds" maxLength={200} value={form.query} placeholder="Search sounds…" onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))} /><button type="submit" aria-label="Submit search" title="Search"><ArrowRight size={15} /></button></div>
        <div className="search-options"><select aria-label="Search mode" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as SearchForm["mode"] }))}><option value="all">All fields</option><option value="title">Title only</option><option value="creator">Creator only</option><option value="tags">Tags only</option></select><External href="https://openverse.org/search-help">Search tips</External></div>
      </ClientForm>
      <div className="search-toolbar"><Button size="sm" variant="outline" onClick={() => setModal("filters")}><SlidersHorizontal size={13} />Filters{chips.length > 0 && <span className="filter-count">{chips.length}</span>}</Button><select aria-label="Sort sounds" value={form.sort === "relevance" ? "relevance" : form.direction === "desc" ? "newest" : "oldest"} onChange={(e) => { const v = e.target.value; const next = { ...form, sort: v === "relevance" ? "relevance" as const : "indexed_on" as const, direction: v === "oldest" ? "asc" as const : "desc" as const }; setForm(next); if (request) void search(next); }}><option value="relevance">Most relevant</option><option value="newest">Newest indexed</option><option value="oldest">Oldest indexed</option></select></div>
      {chips.length > 0 && <div className="filter-chips">{chips.map((chip) => <button key={chip.key + (chip.value || "")} title={"Remove " + chip.label} onClick={() => { const next = { ...form }; if (chip.value) Object.assign(next, { [chip.key]: (next[chip.key] as string[]).filter((v) => v !== chip.value) }); else Object.assign(next, { [chip.key]: defaultForm[chip.key] }); setForm(next); if (request) void search(next); }}>{chip.label}<X size={10} /></button>)}</div>}
    </div>}
    <main className="scroll-content" ref={scroll} id="library-content" role="tabpanel" aria-labelledby={view === "explore" ? "explore-tab" : "saved-tab"}>
      {detail ? <Detail key={detail.id} initial={detail} player={player} saved={isSaved(detail)} onSave={saveAudio} onBack={() => setDetail(undefined)} notify={notify} onAdd={host.audioAvailable ? setAddAudio : undefined} /> : view === "saved" ? <div className="saved-view">
        <h2 className="saved-heading">Saved sounds</h2>
        <p className="field-hint">{library.status === "loading" ? "Loading saved sounds…" : library.status === "saving" ? "Saving…" : library.status === "saved" ? "Saved in this browser through Creator." : "Saved for this session."}</p>
        {library.error && <ErrorNotice message={library.error} />}
        {favorites.length ? favorites.map((a) => <AudioRow key={a.id} audio={a} player={player} saved onSave={saveAudio} onDetails={openDetails} onAdd={host.audioAvailable ? setAddAudio : undefined} showSource />) : <Empty title="Keep your favorite sounds" description="Bookmark a sound to find it here later."><Button variant="outline" size="sm" onClick={() => setView("explore")}>Explore sounds<ArrowRight size={13} /></Button></Empty>}
      </div> : <>
        {error && <ErrorNotice message={error + (cooldown ? " Retry after " + new Date(cooldown).toLocaleTimeString() + "." : "")} action={() => request ? void search(request.form, request.page) : setError("")} label={request ? "Retry" : "Dismiss"} />}
        {loading && <Loading />}
        {response && <div className="result-heading"><span>{response.result_count >= 10000 ? "Top " : ""}{response.result_count.toLocaleString()} sounds · {scopeLabel}</span><span>{response.results.length} loaded</span></div>}
        {!!response?.warnings?.length && <p className="field-hint api-warnings">Openverse returned a warning; some results may be incomplete.</p>}
        {response?.results.map((a) => <AudioRow key={a.id} audio={a} player={player} saved={isSaved(a)} onSave={saveAudio} onDetails={openDetails} onAdd={host.audioAvailable ? setAddAudio : undefined} showSource={shownRequest?.form.sources.length !== 1} />)}
        {response && response.results.length === 0 && !loading && <Empty title="No sounds found" description="Try fewer filters, another keyword, or a different source."><Button variant="outline" size="sm" onClick={() => setModal("filters")}>Adjust filters</Button></Empty>}
        {response && response.results.length > 0 && <div className="pagination">{response.page < response.page_count ? <Button variant="outline" size="sm" loading={loading} disabled={!!error} onClick={() => shownRequest && void search(shownRequest.form, response.page + 1, true)}>Load more sounds<ChevronDown size={13} /></Button> : <p className="field-hint">You've reached the available results.</p>}</div>}
        {!response && !loading && !request && <div className="start-view"><div className="start-heading"><span className="eyebrow">FIND YOUR NEXT SOUND</span><h2>Small sounds.<br /><span>Big possibilities.</span></h2><p>Explore sounds for your next animation.</p></div><div className="suggestion-grid">{suggestions.map((s) => <button key={s.query} className="suggestion" onClick={() => { const next = { ...form, mode: "all" as const, query: s.query }; setForm(next); void search(next); }}><s.icon size={18} /><div><strong>{s.title}</strong><span>{s.hint}</span></div><ArrowRight size={12} /></button>)}</div></div>}
      </>}
    </main>
    {!player.current && player.error && <ErrorNotice message={player.error} />}
    <MiniPlayer player={player} onDetails={openDetails} />
    {host.selectedAudio?.provenance && <button className="scene-audio-link" onClick={() => { void refreshCreator().then((value) => { if (value.selectedAudio?.provenance) setSceneAudioOpen(true); else notify("The selected layer has no Openverse attribution."); }).catch((e: Error) => notify(e.message)); }}>Selected in scene: {host.selectedAudio.name}<span>Attribution ↗</span></button>}
    <div className="plugin-status"><span className="status-dot" /><span>Powered by Openverse</span></div>
    <audio ref={audioRef} preload="none" {...events} />
    {toast && <div className="toast" role="status"><Check size={14} /><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={12} /></button></div>}
    {addAudio && <AddAudio initial={addAudio} host={host} onClose={() => setAddAudio(undefined)} onAdded={(message) => { player.close(); notify(message); }} />}
    {sceneAudioOpen && host.selectedAudio?.provenance && <Modal open onClose={() => setSceneAudioOpen(false)} title="Scene sound attribution" description={host.selectedAudio.name}><textarea className="copy-text" aria-label="Scene sound attribution" value={host.selectedAudio.provenance.attribution} readOnly onFocus={(e) => e.target.select()} /><div className="detail-links"><External href={host.selectedAudio.provenance.sourceUrl}>Original source</External><External href={host.selectedAudio.provenance.licenseUrl}>License terms</External></div></Modal>}
    {modal === "filters" && <Filters form={form} onClose={() => setModal(null)} onApply={(next) => { setForm(next); setModal(null); if (request || next.query.trim()) void search(next); }} />}
    {modal === "help" && <Modal open onClose={() => setModal(null)} title="Openverse Sounds" description="Search, preview, and add sounds to your scene."><div className="help-content"><p>Use the home button to return to sound ideas. Bookmark sounds to keep them in this browser through Creator.</p><p>Creator supports MP3, WAV, M4A, FLAC and OGG up to 20 MB. Trim clips and adjust volume or fades in Creator after adding.</p><p>Check license terms and attribution in a sound's details. Attribution is also stored on the imported layer.</p><p>Space plays or pauses previews; arrow keys seek when focus is outside a control.</p><p>No Openverse account is needed. Date-indexed sorting is experimental and may change.</p><External href="https://openverse.org/search-help">Search help</External></div></Modal>}
  </div>;
};
