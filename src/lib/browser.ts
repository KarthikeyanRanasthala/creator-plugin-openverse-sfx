// Creator's current iframe permits scripts, but not popup windows or downloads.
// Keep fallbacks in the UI while the Creator sandbox remains a placeholder.
export function isEmbeddedPanel() { return window.self !== window.top; }
