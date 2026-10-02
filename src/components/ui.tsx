import { Button, DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@lottiefiles/creator-plugins-ui";
import { ExternalLink, LoaderCircle, AlertCircle, SearchX } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { safeUrl } from "../lib/model.ts";
import { isEmbeddedPanel } from "../lib/browser.ts";
import { creatorConnected, creatorRequest } from "../lib/creator.ts";

export function IconButton({ label, children, className = "", ...props }: ComponentProps<typeof Button> & { label: string }) {
  return <Button type="button" variant="ghost" size="icon" className={"icon-button " + className} title={label} aria-label={label} {...props}>{children}</Button>;
}
// Creator disallows native form submission. Handle activation as a client action,
// including Enter in inputs, while retaining native field validation.
export function ClientForm({ onAction, children, ...props }: Omit<ComponentProps<"form">, "onSubmit"> & { onAction: () => void }) {
  function activate(form: HTMLFormElement) {
    if (form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled) return;
    if (form.reportValidity()) onAction();
  }
  return <form {...props} onSubmit={(event) => { event.preventDefault(); activate(event.currentTarget); }} onClick={(event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (button?.type === "submit" && button.form === event.currentTarget && !button.disabled) { event.preventDefault(); activate(event.currentTarget); }
  }} onKeyDown={(event) => {
    if (event.key === "Enter" && event.target instanceof HTMLElement && !event.target.closest("textarea, select, button")) { event.preventDefault(); activate(event.currentTarget); }
  }}>{children}</form>;
}
export function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <DialogRoot open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <DialogContent className={"plugin-dialog " + (wide ? "filter-dialog" : "")}>
      <DialogHeader className="dialog-heading">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description || " "}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </DialogRoot>;
}
export function External({ href, children, className = "" }: { href?: string | null; children: ReactNode; className?: string }) {
  const [showLink, setShowLink] = useState(false);
  const url = safeUrl(href);
  return url ? <><a href={url} target="_blank" rel="noopener noreferrer" className={"external-link " + className} onClick={(event) => {
    if (isEmbeddedPanel()) { event.preventDefault(); if (creatorConnected()) void creatorRequest("link", url).catch(() => setShowLink(true)); else setShowLink(true); }
  }}>{children}<ExternalLink size={12} /></a>{showLink && <LinkDialog url={url} onClose={() => setShowLink(false)} />}</> : null;
}
export function LinkDialog({ url, onClose }: { url: string; onClose: () => void }) {
  return <Modal open onClose={onClose} title="Open in your browser" description="Creator restricts external windows and downloads from this panel. Select and copy this URL, then open it in a browser tab."><textarea className="copy-text" value={url} readOnly aria-label="URL to copy" onFocus={(event) => event.target.select()} /></Modal>;
}
export function Loading({ label = "Searching sounds…" }: { label?: string }) {
  return <div className="loading-state" role="status"><LoaderCircle size={18} className="spin" /><span>{label}</span></div>;
}
export function ErrorNotice({ message, action, label = "Retry" }: { message: string; action?: () => void; label?: string }) {
  return <div className="error-notice" role="alert"><AlertCircle size={15} /><div><p>{message}</p>{action && <Button variant="outline" size="sm" onClick={action}>{label}</Button>}</div></div>;
}
export function Empty({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><SearchX size={24} /></div><h2>{title}</h2><p>{description}</p>{children}</div>;
}
