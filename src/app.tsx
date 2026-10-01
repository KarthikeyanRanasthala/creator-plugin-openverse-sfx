import { useLayoutEffect, useRef, useState } from "react";
import { Button, Input } from "@lottiefiles/creator-plugins-ui";
import { AudioLines, ArrowDownToLine, ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, CircleHelp, Compass, FolderOpen, History, Keyboard, Library, MoreHorizontal, Search, SlidersHorizontal, Sparkles, Upload, Waves, Wind, Zap, MousePointer2, Footprints, Droplets, Music2, X } from "lucide-react";
import { api, ApiError } from "./lib/api.ts";
import { defaultForm, filterChips, readForm, serializeSearch, sourceName, starterSources } from "./lib/model.ts";
import type { Audio, AudioPage, Collection, SavedSearch, SearchForm, SearchRequest, Source } from "./lib/model.ts";
import { downloadJson, readSession } from "./lib/session.ts";
import { isEmbeddedPanel } from "./lib/browser.ts";
import { usePlayer } from "./lib/use-player.ts";
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
  const [pageJump, setPageJump] = useState("");
  const [view, setView] = useState<"explore" | "saved">("explore");
  const [savedView, setSavedView] = useState<"sounds" | "searches" | "recent">("sounds");
  const [favorites, setFavorites] = useState<Audio[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recent, setRecent] = useState<Audio[]>([]);
  const [detailStack, setDetailStack] = useState<Audio[]>([]);
  const [sources, setSources] = useState<Source[]>(starterSources);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState("");
  const [modal, setModal] = useState<"filters" | "tools" | "sources" | "collection" | "help" | "export" | "import" | null>(null);
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const scroll = useRef<HTMLElement>(null);
  const scrollPosition = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const { audioRef, events, ...player } = usePlayer();
  const chips = filterChips(form);
  const collection = request?.collection;
  const activeDetail = detailStack.at(-1);
  function notify(message: string) {
    clearTimeout(toastTimer.current); setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  async function search(nextForm: SearchForm, page = 1, nextCollection?: Collection, append = false) {
    const next = { form: nextForm, page, collection: nextCollection };
    try { serializeSearch(next); } catch (e) { setError((e as Error).message); return; }
    const id = ++generation.current;
    setRequest(next); setLoading(true); setError(""); setView("explore"); setDetailStack([]);
    if (!append) scrollPosition.current = 0;
    try {
      const result = await api.search(next);
      if (id !== generation.current) return;
      setResponse((previous) => append && previous ? { ...result, results: [...new Map([...previous.results, ...result.results].map((a) => [a.id, a])).values()] } : result);
      setShownRequest(next); setPageJump(""); setCooldown(0);
      if (!append && scroll.current) scroll.current.scrollTop = 0;
    } catch (e) {
      if (id !== generation.current) return;
      setError((e as Error).message);
      if (e instanceof ApiError) setCooldown(e.retryAt);
    } finally { if (id === generation.current) setLoading(false); }
  }
  async function loadSources() {
    if (sourcesLoading || sourcesLoaded) return;
    setSourcesLoading(true); setSourcesError("");
    try { const data = await api.sources(); if (data.length) { setSources(data); setSourcesLoaded(true); } else setSourcesError("Openverse didn't return any sources. Known source choices are still available."); }
    catch (e) { setSourcesError((e as Error).message); }
    finally { setSourcesLoading(false); }
  }
  function saveAudio(a: Audio) {
    if (!favorites.some((s) => s.id === a.id) && favorites.length >= 500) { notify("Your session has 500 saved sounds. Export or remove some before adding more."); return; }
    setFavorites((list) => list.some((s) => s.id === a.id) ? list.filter((s) => s.id !== a.id) : [...list, a]);
  }
  function audition(a: Audio, url?: string | null, seconds?: number, forcePlay?: boolean) {
    setRecent((list) => [a, ...list.filter((s) => s.id !== a.id)].slice(0, 30));
    player.select(a, url, seconds, forcePlay);
  }
  const sharedPlayer = { ...player, select: audition };
  function openDetails(a: Audio) {
    if (detailStack.at(-1)?.id === a.id) return;
    if (!detailStack.length) scrollPosition.current = scroll.current?.scrollTop || 0;
    setDetailStack((list) => [...list, a]);
    if (scroll.current) scroll.current.scrollTop = 0;
  }
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = detailStack.length ? 0 : scrollPosition.current;
  }, [detailStack.length]);
  function changeSource(value: string) {
    if (value === "custom") { setModal("filters"); void loadSources(); return; }
    const next = { ...form, sources: value === "all" ? [] : [value], excludedSources: form.excludedSources.filter((s) => s !== value) };
    setForm(next);
    if (request && !collection) void search(next);
  }
  function runCollection(c: Collection) { setModal(null); void search(form, 1, c); }
  function exitCollection() {
    setRequest(undefined); setResponse(undefined); setShownRequest(undefined); setDetailStack([]); setError(""); ++generation.current; setLoading(false);
    if (form.query.trim() || (form.mode === "fields" && [form.title, form.creator, form.tags].some((s) => s.trim()))) void search(form);
  }
  function saveSearch() {
    const f = shownRequest?.form || form;
    if (collection) { notify("Return to search to save a filtered search."); return; }
    try { serializeSearch({ form: f, page: 1 }); } catch { notify("Run a search before saving it."); return; }
    if (savedSearches.some((s) => JSON.stringify(s.form) === JSON.stringify(f))) { notify("This search is already saved"); return; }
    if (savedSearches.length >= 100) { notify("Your session has 100 saved searches."); return; }
    const name = (f.mode === "fields" ? [f.title, f.creator, f.tags].filter(Boolean).join(" · ") : f.query) + " · " + (f.sources.length === 1 ? sourceName(f.sources[0]) : "All / selected sources");
    setSavedSearches((list) => [...list, { name: name.slice(0, 200), form: structuredClone(f) }]); notify("Search saved for this session");
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("Choose a file smaller than 2 MB.");
      importSession(await file.text());
    } catch (e) { notify((e as Error).message); }
  }
  function importSession(text: string) {
      const data = readSession(text);
      const tracks = [...new Map([...favorites, ...data.tracks].map((a) => [a.id, a])).values()];
      const searches = [...new Map([...savedSearches, ...data.searches].map((s) => [JSON.stringify(s.form), s])).values()];
      if (tracks.length > 500 || searches.length > 100) throw new Error("Import would exceed 500 saved sounds or 100 saved searches.");
      setFavorites(tracks); setSavedSearches(searches); setImportText(""); notify("Saved sounds and searches imported"); setModal(null);
  }
  function exportSession() {
    const data = { version: 1, tracks: favorites.map((a) => ({ ...a, peaks: [] })), searches: savedSearches };
    if (isEmbeddedPanel()) { setExportText(JSON.stringify(data, null, 2)); setModal("export"); }
    else { downloadJson(data); setModal(null); }
  }
  const sourceValue = form.sources.length === 0 ? "all" : form.sources.length === 1 ? form.sources[0] : "custom";
  const isSaved = (a: Audio) => favorites.some((s) => s.id === a.id);
  const scopeLabel = shownRequest?.form.sources.length === 1 ? sourceName(shownRequest.form.sources[0]) : "Openverse";
  return <div className="plugin-shell">
    <header className="plugin-header"><div className="brand"><div className="brand-icon"><AudioLines size={19} /></div><div><h1>Openverse <span>Sounds</span></h1><span className="brand-caption">A sound for every moment</span></div></div><IconButton label="Library tools" onClick={() => setModal("tools")}><MoreHorizontal size={19} /></IconButton></header>
    <div className="primary-tabs" role="tablist" aria-label="Library view">
      <button role="tab" aria-selected={view === "explore"} aria-controls="library-content" id="explore-tab" className={view === "explore" ? "active" : ""} onClick={() => { setView("explore"); setDetailStack([]); }}><Compass size={14} />Explore</button>
      <button role="tab" aria-selected={view === "saved"} aria-controls="library-content" id="saved-tab" className={view === "saved" ? "active" : ""} onClick={() => { setView("saved"); setDetailStack([]); scrollPosition.current = 0; }}><Bookmark size={14} />Saved{favorites.length > 0 && <span className="tab-count">{favorites.length}</span>}</button>
      <div className="source-picker"><span className="source-dot" /><select aria-label="Audio source" disabled={!!collection} value={sourceValue} onFocus={() => void loadSources()} onChange={(e) => changeSource(e.target.value)}><option value="all">All sources</option>{sources.map((s) => <option key={s.source_name} value={s.source_name}>{s.display_name}</option>)}<option value="custom">{form.sources.length > 1 ? form.sources.length + " sources" : "Choose sources…"}</option></select><ChevronDown size={12} /></div>
    </div>
    {view === "explore" && !activeDetail && <div className="search-area">
      {collection ? <div className="collection-banner"><FolderOpen size={15} /><div><strong>{collection.label}</strong><span>{collection.kind} collection · newest indexed first</span></div><IconButton label="Return to search" onClick={exitCollection}><X size={15} /></IconButton></div> : <ClientForm onAction={() => { void search(form); }}>
        <div className="search-box"><Search size={16} /><Input aria-label="Search sounds" maxLength={200} value={form.query} disabled={form.mode === "fields"} placeholder={form.mode === "fields" ? "Use the specific fields below" : "Search sounds…"} onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))} /><button type="submit" aria-label="Submit search" title="Search"><ArrowRight size={15} /></button></div>
        <div className="search-options"><select aria-label="Search mode" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as SearchForm["mode"] }))}><option value="all">All fields</option><option value="title">Title only</option><option value="creator">Creator only</option><option value="tags">Tags only</option><option value="fields">Specific fields</option></select><External href="https://openverse.org/search-help">Search tips</External></div>
        {form.mode === "fields" && <div className="specific-fields">{(["title", "creator", "tags"] as const).map((field) => <label className="field" key={field}>{field}<Input maxLength={200} value={form[field]} placeholder={"Search " + field} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} /></label>)}<Button size="sm" type="submit">Search fields</Button></div>}
      </ClientForm>}
      <div className="search-toolbar"><Button size="sm" variant="outline" disabled={!!collection} title={collection ? "Collections don't support ordinary search filters" : "Refine your search"} onClick={() => { setModal("filters"); void loadSources(); }}><SlidersHorizontal size={13} />Filters{chips.length > 0 && !collection && <span className="filter-count">{chips.length}</span>}</Button><select aria-label="Sort sounds" value={form.sort === "relevance" ? "relevance" : form.direction === "desc" ? "newest" : "oldest"} disabled={!!collection} onChange={(e) => { const v = e.target.value; const next = { ...form, sort: v === "relevance" ? "relevance" as const : "indexed_on" as const, direction: v === "oldest" ? "asc" as const : "desc" as const }; setForm(next); if (request) void search(next); }}><option value="relevance">Most relevant</option><option value="newest">Newest indexed · experimental</option><option value="oldest">Oldest indexed · experimental</option></select><IconButton label="Save search" disabled={!!collection || !response} onClick={saveSearch}><Bookmark size={14} /></IconButton></div>
      {!collection && chips.length > 0 && <div className="filter-chips">{chips.map((chip) => <button key={chip.key + (chip.value || "")} title={"Remove " + chip.label} onClick={() => { const next = { ...form }; if (chip.value) Object.assign(next, { [chip.key]: (next[chip.key] as string[]).filter((v) => v !== chip.value) }); else Object.assign(next, { [chip.key]: defaultForm[chip.key] }); setForm(next); if (request) void search(next); }}>{chip.label}<X size={10} /></button>)}</div>}
    </div>}
    <main className="scroll-content" ref={scroll} id="library-content" role="tabpanel" aria-labelledby={view === "explore" ? "explore-tab" : "saved-tab"}>
      {activeDetail ? <Detail key={activeDetail.id} initial={activeDetail} player={sharedPlayer} saved={isSaved(activeDetail)} onSave={saveAudio} onBack={() => setDetailStack((list) => list.slice(0, -1))} onCollection={runCollection} onDetails={openDetails} isSaved={isSaved} notify={notify} /> : view === "saved" ? <div className="saved-view">
        <div className="split saved-heading"><h2>Your collection</h2><div><IconButton label="Export saved sounds and searches" onClick={exportSession}><ArrowDownToLine size={15} /></IconButton><IconButton label="Import saved sounds and searches" onClick={() => setModal("import")}><Upload size={15} /></IconButton></div></div>
        <p className="field-hint">Saved for this session. Export to keep your collection.</p>
        <div className="sub-tabs">{(["sounds", "searches", "recent"] as const).map((v) => <button key={v} aria-pressed={savedView === v} className={savedView === v ? "active" : ""} onClick={() => setSavedView(v)}>{v === "recent" && <History size={12} />}{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        {savedView === "searches" ? savedSearches.length ? savedSearches.map((s, i) => <div className="saved-search" key={i}><button onClick={() => { const f = readForm(s.form); setForm(f); void search(f); }}><Search size={14} /><span>{s.name}</span></button><IconButton label={"Remove saved search " + s.name} onClick={() => setSavedSearches((list) => list.filter((_, n) => n !== i))}><X size={13} /></IconButton></div>) : <Empty title="Keep a good search" description="Save a search from the results toolbar to return to its filters later." /> : (savedView === "recent" ? recent : favorites).length ? (savedView === "recent" ? recent : favorites).map((a) => <AudioRow key={a.id} audio={a} player={sharedPlayer} saved={isSaved(a)} onSave={saveAudio} onDetails={openDetails} showSource />) : <Empty title={savedView === "recent" ? "Your listening trail" : "Make a little sound library"} description={savedView === "recent" ? "Sounds you audition appear here for this session." : "Bookmark sounds as you explore. They'll be waiting here while the plugin is open."}><Button variant="outline" size="sm" onClick={() => setView("explore")}>Explore sounds<ArrowRight size={13} /></Button></Empty>}
      </div> : <>
        {error && <ErrorNotice message={error + (cooldown ? " Retry after " + new Date(cooldown).toLocaleTimeString() + "." : "")} action={() => request ? void search(request.form, request.page, request.collection) : setError("")} label={request ? "Retry" : "Dismiss"} />}
        {loading && <Loading label={collection ? "Opening collection…" : "Searching sounds…"} />}
        {response && <div className="result-heading"><span>{response.result_count >= 10000 ? "Top " : ""}{response.result_count.toLocaleString()} sounds{shownRequest?.collection ? "" : " · " + scopeLabel}</span><span>{response.results.length} loaded</span></div>}
        {!!response?.warnings?.length && <details className="api-warnings"><summary>Openverse returned a search warning</summary>{response.warnings.map((w, i) => <p key={i}>{typeof w === "string" ? w : w && typeof w === "object" && typeof (w as Record<string, unknown>).message === "string" ? String((w as Record<string, unknown>).message) : JSON.stringify(w)}</p>)}</details>}
        {response?.results.map((a) => <AudioRow key={a.id} audio={a} player={sharedPlayer} saved={isSaved(a)} onSave={saveAudio} onDetails={openDetails} showSource={shownRequest?.form.sources.length !== 1 || !!shownRequest?.collection} />)}
        {response && response.results.length === 0 && !loading && <Empty title="No sounds found" description={collection ? "This exact collection has no available sounds." : form.categories.length ? "Category metadata can be incomplete. Try removing the category filter or broadening your search." : "Try fewer filters, another keyword, or a different source."}><Button variant="outline" size="sm" onClick={() => collection ? exitCollection() : setModal("filters")}>{collection ? "Return to search" : "Adjust filters"}</Button></Empty>}
        {response && response.results.length > 0 && <div className="pagination">
          {response.page < response.page_count ? <Button variant="outline" size="sm" loading={loading} disabled={!!error} onClick={() => shownRequest && void search(shownRequest.form, response.page + 1, shownRequest.collection, true)}>Load more sounds<ChevronDown size={13} /></Button> : <p className="field-hint">You've reached the available results.</p>}
          <ClientForm className="page-jump" onAction={() => { const page = Number(pageJump); if (shownRequest && Number.isInteger(page) && page >= 1 && page <= response.page_count) void search(shownRequest.form, page, shownRequest.collection); else notify("Choose a page between 1 and " + response.page_count); }}><IconButton label="Previous page" disabled={loading || !!error || response.page <= 1} onClick={() => shownRequest && void search(shownRequest.form, response.page - 1, shownRequest.collection)}><ArrowLeft size={12} /></IconButton><span>Page {response.page} of {response.page_count}</span><Input className="page-input" aria-label="Jump to page" type="number" min={1} max={response.page_count} value={pageJump} placeholder="#" onChange={(e) => setPageJump(e.target.value)} /><button type="submit" disabled={loading || !!error}>Go</button></ClientForm>
        </div>}
        {!response && !loading && !request && <div className="start-view"><div className="start-heading"><span className="eyebrow">FIND YOUR NEXT SOUND</span><h2>Small sounds.<br /><span>Big possibilities.</span></h2><p>Explore sounds for your next animation.</p></div><div className="suggestion-grid">{suggestions.map((s) => <button key={s.query} className="suggestion" onClick={() => { const next = { ...form, mode: "all" as const, query: s.query }; setForm(next); void search(next); }}><s.icon size={18} /><div><strong>{s.title}</strong><span>{s.hint}</span></div><ArrowRight size={12} /></button>)}</div><div className="start-note"><AudioLines size={14} /><span>Discover openly licensed audio from {form.sources.length === 1 ? sourceName(form.sources[0]) : "Openverse"}.</span></div></div>}
      </>}
    </main>
    {!player.current && player.error && <ErrorNotice message={player.error} />}
    <MiniPlayer player={sharedPlayer} onDetails={openDetails} />
    <div className="plugin-status"><span className="status-dot" /><span>Powered by Openverse</span><span className="status-right">Anonymous access</span></div>
    <audio ref={audioRef} preload="none" {...events} />
    <input hidden ref={fileInput} type="file" accept=".json,application/json" onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ""; }} />
    {toast && <div className="toast" role="status"><Check size={14} /><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={12} /></button></div>}
    {modal === "filters" && <Filters form={form} sources={sources} onClose={() => setModal(null)} onApply={(next) => { setForm(next); setModal(null); if (request || next.query.trim() || next.mode === "fields") void search(next); }} />}
    {modal === "tools" && <Modal open onClose={() => setModal(null)} title="Library tools" description="Explore further or keep your session."><div className="tools-list"><button onClick={() => { setModal("sources"); void loadSources(); }}><Library size={17} /><div><strong>Browse sources</strong><span>Providers & catalog sizes</span></div><ArrowRight size={13} /></button><button onClick={() => setModal("collection")}><FolderOpen size={17} /><div><strong>Open a collection</strong><span>Exact tag, creator or source</span></div><ArrowRight size={13} /></button><button onClick={exportSession}><ArrowDownToLine size={17} /><div><strong>Export saved items</strong><span>Keep your sounds & searches</span></div></button><button onClick={() => setModal("import")}><Upload size={17} /><div><strong>Import saved items</strong><span>Choose a file or paste JSON</span></div></button><button onClick={() => setModal("help")}><CircleHelp size={17} /><div><strong>Help & shortcuts</strong><span>Playback, licenses & API access</span></div><ArrowRight size={13} /></button></div></Modal>}
    {modal === "export" && <Modal open onClose={() => setModal(null)} title="Export saved items" description="Select and copy this JSON into a .json file to keep your collection. Creator restricts direct downloads from this panel."><textarea className="copy-text session-json" aria-label="Saved items JSON to copy" value={exportText} readOnly onFocus={(e) => e.target.select()} /><p className="field-hint">Waveform data is fetched again when you preview a saved sound.</p></Modal>}
    {modal === "import" && <Modal open onClose={() => setModal(null)} title="Import saved items" description="Choose an Openverse saved-items file or paste its JSON. Items are merged with this session."><Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload size={14} />Choose JSON file</Button><ClientForm onAction={() => { try { importSession(importText); } catch (error) { notify((error as Error).message); } }}><label className="field import-field">Or paste JSON<textarea className="session-json" aria-label="Saved items JSON" maxLength={2_000_000} value={importText} onChange={(e) => setImportText(e.target.value)} rows={7} /></label><div className="dialog-actions"><Button variant="ghost" type="button" size="sm" onClick={() => setModal(null)}>Cancel</Button><Button type="submit" size="sm" disabled={!importText.trim()}>Import JSON</Button></div></ClientForm></Modal>}
    {modal === "sources" && <Modal open onClose={() => setModal(null)} title="Audio sources" description="Current catalog counts from Openverse.">{sourcesLoading && <Loading label="Loading sources…" />}{sourcesError && <ErrorNotice message={sourcesError} action={() => void loadSources()} />}{sources.map((s) => <div className="source-card" key={s.source_name}><div><strong>{s.display_name}</strong><span>{s.media_count == null ? "Catalog count not loaded" : s.media_count.toLocaleString() + " audio items"}</span><External href={s.source_url}>Visit source</External></div><Button variant="outline" size="sm" onClick={() => runCollection({ kind: "source", value: s.source_name, label: s.display_name })}>Browse</Button></div>)}</Modal>}
    {modal === "collection" && <CollectionPicker sources={sources} onClose={() => setModal(null)} onOpen={runCollection} />}
    {modal === "help" && <Modal open onClose={() => setModal(null)} title="A little help" description="Find, audition and collect audio inside Creator."><div className="help-content"><h3><Keyboard size={14} />Playback shortcuts</h3><p>Space plays or pauses. Left and right arrows seek by 5 seconds when focus is outside a control. Waveforms and sliders also work with the keyboard.</p><h3>Licenses & attribution</h3><p>Check the original source and license terms before using a sound. Copy attribution from its details.</p><h3>Your saved sounds</h3><p>Saved sounds and searches last for this session. Export JSON to keep them; import it when you return. Creator shows selectable text when file downloads are restricted.</p><h3>Anonymous API access</h3><p>No registration is needed. Searches are submitted explicitly, results are cached, and Openverse may limit requests. Experimental controls may change.</p>{api.usage && <p>{api.usage}</p>}<div className="detail-links"><External href="https://openverse.org/search-help">Search syntax</External><External href="https://api.openverse.org/v1/">API documentation</External></div></div></Modal>}
  </div>;
};
function CollectionPicker({ sources, onClose, onOpen }: { sources: Source[]; onClose: () => void; onOpen: (c: Collection) => void }) {
  const [kind, setKind] = useState<Collection["kind"]>("tag");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("freesound");
  return <Modal open onClose={onClose} title="Open a collection" description="Experimental. Collections match exact names and show newest indexed items.">
    <ClientForm onAction={() => { if (kind === "source" || value.trim()) onOpen({ kind, value: kind === "source" ? source : value, source: kind === "creator" ? source : undefined, label: kind === "source" ? sourceName(source) : value }); }}>
      <label className="field">Collection type<select value={kind} onChange={(e) => setKind(e.target.value as Collection["kind"])}><option value="tag">Exact tag</option><option value="creator">Creator at a source</option><option value="source">Source</option></select></label>
      {kind !== "source" && <label className="field">{kind === "tag" ? "Exact tag" : "Exact creator name"}<Input required maxLength={200} value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "tag" ? "whoosh" : "Creator name"} /></label>}
      {kind !== "tag" && <label className="field">Source<select value={source} onChange={(e) => setSource(e.target.value)}>{sources.map((s) => <option key={s.source_name} value={s.source_name}>{s.display_name}</option>)}</select></label>}
      <p className="field-hint">Ordinary search filters are suspended while browsing a collection. Your search is kept for when you return.</p>
      <div className="dialog-actions"><Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button><Button size="sm" type="submit">Open collection</Button></div>
    </ClientForm>
  </Modal>;
}
