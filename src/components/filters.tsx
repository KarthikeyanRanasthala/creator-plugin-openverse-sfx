import { useState } from "react";
import { Button, Input } from "@lottiefiles/creator-plugins-ui";
import { SlidersHorizontal } from "lucide-react";
import { categories, defaultForm, extensions, lengths, licenses, usageTypes, validateForm } from "../lib/model.ts";
import type { SearchForm, Source } from "../lib/model.ts";
import { ClientForm, Modal } from "./ui.tsx";

function MultiChoice({ label, options, selected, onChange }: { label: string; options: readonly (readonly [string, string])[]; selected: string[]; onChange: (values: string[]) => void }) {
  return <fieldset className="filter-group"><legend>{label}</legend><div className="choice-grid">{options.map(([value, text]) => <label key={value} className="check-option"><input type="checkbox" checked={selected.includes(value)} onChange={(e) => onChange(e.target.checked ? [...selected, value] : selected.filter((s) => s !== value))} /><span>{text}</span></label>)}</div></fieldset>;
}
function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="check-option standalone"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}{hint && <small>{hint}</small>}</span></label>;
}
export function Filters({ form, sources, onClose, onApply }: { form: SearchForm; sources: Source[]; onClose: () => void; onApply: (form: SearchForm) => void }) {
  const [draft, setDraft] = useState(form);
  const [error, setError] = useState("");
  function update<K extends keyof SearchForm>(key: K, value: SearchForm[K]) { setDraft((f) => ({ ...f, [key]: value })); setError(""); }
  return <Modal open onClose={onClose} title="Refine your search" description="Apply filters when you're ready." wide>
    <ClientForm className="filter-form" onAction={() => { try { validateForm(draft); onApply(draft); } catch (err) { setError((err as Error).message); } }}>
      <div className="dialog-scroll">
        <MultiChoice label="Usage" options={usageTypes} selected={draft.usage} onChange={(v) => {
          const added = v.find((s) => !draft.usage.includes(s));
          update("usage", added === "all" ? ["all"] : v.filter((s) => s !== "all"));
        }} />
        <MultiChoice label="License" options={licenses} selected={draft.licenses} onChange={(v) => update("licenses", v)} />
        <MultiChoice label="Duration" options={lengths} selected={draft.lengths} onChange={(v) => update("lengths", v)} />
        <MultiChoice label="Format" options={extensions.map((v) => [v, v.toUpperCase()] as const)} selected={draft.extensions} onChange={(v) => update("extensions", v)} />
        <label className="field">Other file extensions<Input value={draft.customExtensions} placeholder="aiff, m4a" onChange={(e) => update("customExtensions", e.target.value)} /></label>
        <MultiChoice label="Include sources" options={sources.map((s) => [s.source_name, s.display_name] as const)} selected={draft.sources} onChange={(v) => { update("sources", v); setDraft((f) => ({ ...f, excludedSources: f.excludedSources.filter((s) => !v.includes(s)) })); }} />
        <p className="field-hint">No sources selected searches all sources.</p>
        <MultiChoice label="Exclude sources" options={sources.map((s) => [s.source_name, s.display_name] as const)} selected={draft.excludedSources} onChange={(v) => { update("excludedSources", v); setDraft((f) => ({ ...f, sources: f.sources.filter((s) => !v.includes(s)) })); }} />
        <MultiChoice label="Audio category" options={categories} selected={draft.categories} onChange={(v) => update("categories", v)} />
        <p className="field-hint">Many sounds have no category. Choosing one can hide relevant results.</p>
        <details className="advanced"><summary><SlidersHorizontal size={14} />Advanced controls</summary>
          <Check label="Hide known broken links" hint="Provider links can still become unavailable." checked={draft.filterDead} onChange={(v) => update("filterDead", v)} />
          <Check label="Include mature content" hint="Uses the standard content flag." checked={draft.mature} onChange={(v) => { update("mature", v); if (v) update("sensitive", false); }} />
          <Check label="Include sensitive results" hint="Experimental alternative to the mature-content flag. Choose one." checked={draft.sensitive} onChange={(v) => { update("sensitive", v); if (v) update("mature", false); }} />
          <Check label="Include waveform peaks" hint="Fetch peaks with search results for inline waveforms." checked={draft.peaks} onChange={(v) => update("peaks", v)} />
          <div className="field-row"><label className="field">Sort <span className="experimental">Experimental</span><select value={draft.sort} onChange={(e) => update("sort", e.target.value as SearchForm["sort"])}><option value="relevance">Relevance</option><option value="indexed_on">Date indexed</option></select></label>
            <label className="field">Direction<select value={draft.direction} disabled={draft.sort === "relevance"} onChange={(e) => update("direction", e.target.value as SearchForm["direction"])}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label></div>
          <Check label="Prefer authoritative sources" hint="Experimental relevance boost." checked={draft.authority} onChange={(v) => update("authority", v)} />
          <label className="field">Authority boost (0–10)<Input type="number" min={0} max={10} step={0.1} value={draft.authorityBoost} disabled={!draft.authority} onChange={(e) => update("authorityBoost", Number(e.target.value))} /></label>
          <label className="field">Results per page (1–20)<Input type="number" min={1} max={20} step={1} value={draft.pageSize} onChange={(e) => update("pageSize", Number(e.target.value))} /></label>
        </details>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="dialog-actions"><Button variant="ghost" size="sm" type="button" onClick={() => { setDraft({ ...defaultForm, query: form.query, mode: form.mode, title: form.title, creator: form.creator, tags: form.tags, sources: form.sources }); setError(""); }}>Reset filters</Button><Button type="submit" size="sm">Apply filters</Button></div>
    </ClientForm>
  </Modal>;
}
