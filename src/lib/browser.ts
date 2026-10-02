// Public Creator iframes restrict popups and downloads; links use the host bridge.
export function isEmbeddedPanel() { return window.self !== window.top; }
