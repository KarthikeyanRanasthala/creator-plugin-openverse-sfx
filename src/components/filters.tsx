import { useState } from "react";
import { Button } from "@lottiefiles/creator-plugins-ui";
import { defaultForm, extensions, lengths, licenses, validateForm } from "../lib/model.ts";
import type { SearchForm } from "../lib/model.ts";
import { ClientForm, Modal } from "./ui.tsx";

function MultiChoice({ label, options, selected, onChange }: { label: string; options: readonly (readonly [string, string])[]; selected: string[]; onChange: (values: string[]) => void }) {
  return <fieldset className="filter-group"><legend>{label}</legend><div className="choice-grid">{options.map(([value, text]) => <label key={value} className="check-option"><input type="checkbox" checked={selected.includes(value)} onChange={(e) => onChange(e.target.checked ? [...selected, value] : selected.filter((s) => s !== value))} /><span>{text}</span></label>)}</div></fieldset>;
}
export function Filters({ form, onClose, onApply }: { form: SearchForm; onClose: () => void; onApply: (form: SearchForm) => void }) {
  const [draft, setDraft] = useState(form);
  const [error, setError] = useState("");
  function update<K extends keyof SearchForm>(key: K, value: SearchForm[K]) { setDraft((f) => ({ ...f, [key]: value })); setError(""); }
  return <Modal open onClose={onClose} title="Filter sounds" wide>
    <ClientForm className="filter-form" onAction={() => { try { validateForm(draft); onApply(draft); } catch (err) { setError((err as Error).message); } }}>
      <div className="dialog-scroll">
        <MultiChoice label="Usage" options={[["commercial", "Use commercially"], ["modification", "Modify or adapt"]]} selected={draft.usage} onChange={(v) => update("usage", v)} />
        <MultiChoice label="Duration" options={lengths} selected={draft.lengths} onChange={(v) => update("lengths", v)} />
        <MultiChoice label="Format" options={extensions.map((v) => [v, v.toUpperCase()] as const)} selected={draft.extensions} onChange={(v) => update("extensions", v)} />
        <p className="field-hint">Only Creator-supported formats. None selected includes all five.</p>
        <MultiChoice label="License" options={licenses} selected={draft.licenses} onChange={(v) => update("licenses", v)} />
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="dialog-actions"><Button variant="ghost" size="sm" type="button" onClick={() => { setDraft({ ...defaultForm, query: form.query, mode: form.mode, sources: form.sources, sort: form.sort, direction: form.direction }); setError(""); }}>Reset filters</Button><Button type="submit" size="sm">Apply filters</Button></div>
    </ClientForm>
  </Modal>;
}
