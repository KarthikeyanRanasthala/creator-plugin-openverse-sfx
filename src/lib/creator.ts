import { useEffect, useSyncExternalStore } from "react";
import type { CreatorContext, HostReply, HostState } from "../../shared/creator.ts";
import { isEmbeddedPanel } from "./browser.ts";

let context: CreatorContext = { connected: false, audioAvailable: false };
let started = false;
let serial = 0;
const subscribers = new Set<() => void>();
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>();
function update(value: CreatorContext) { context = value; subscribers.forEach((callback) => callback()); }
function listen(event: MessageEvent) {
  if (event.source !== window.parent) return;
  const message = event.data?.pluginMessage as HostReply | HostState | undefined;
  if (!message) return;
  if (message.type === "openverse:state") { update(message.value); return; }
  if (message.type !== "openverse:reply") return;
  const task = pending.get(message.id);
  if (!task) return;
  clearTimeout(task.timer); pending.delete(message.id);
  if (message.ok) task.resolve(message.value); else task.reject(new Error(message.error || "Creator couldn't complete this action."));
}
export function creatorRequest<T = unknown>(action: string, value?: unknown): Promise<T> {
  if (!isEmbeddedPanel()) return Promise.reject(new Error("Open this plugin inside Creator to use this action."));
  if (!started) { started = true; window.addEventListener("message", listen); }
  const id = "ov-" + ++serial;
  return new Promise((resolve, reject) => {
    const timeout = action === "import" ? 120_000 : action === "save" || action === "load" ? 30_000 : 8000;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(action === "import" ? "Creator is still processing this import. Wait for it to finish before trying again." : "Creator didn't respond. Reopen the plugin and try again.")); }, timeout);
    pending.set(id, { resolve: (result) => resolve(result as T), reject, timer });
    window.parent.postMessage({ pluginMessage: { type: "openverse:" + action, id, value } }, "*");
  });
}
export function useCreator() {
  const state = useSyncExternalStore((callback) => { subscribers.add(callback); return () => { subscribers.delete(callback); }; }, () => context);
  useEffect(() => {
    if (isEmbeddedPanel()) void creatorRequest<CreatorContext>("ready").then(update).catch(() => {});
  }, []);
  return state;
}
export function creatorConnected() { return context.connected; }
export async function refreshCreator() { const value = await creatorRequest<CreatorContext>("context"); update(value); return value; }
