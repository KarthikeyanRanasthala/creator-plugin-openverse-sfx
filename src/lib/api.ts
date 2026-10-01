import { API_BASE, normalizeAudio, serializeSearch, uuidPattern } from "./model.ts";
import type { Audio, AudioPage, SearchRequest, Source } from "./model.ts";

export class ApiError extends Error {
  status: number;
  retryAt: number;
  constructor(message: string, status = 0, retryAt = 0) { super(message); this.name = "ApiError"; this.status = status; this.retryAt = retryAt; }
}
export class OpenverseClient {
  private cache = new Map<string, { data: unknown; expires: number }>();
  private pending = new Map<string, Promise<unknown>>();
  private blockedUntil = 0;
  usage: string | undefined;
  async get<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) return cached.data as T;
    if (this.blockedUntil > Date.now()) throw new ApiError("Openverse is limiting requests. Try again after the cooldown.", 429, this.blockedUntil);
    const existing = this.pending.get(path);
    if (existing) return existing as Promise<T>;
    const task = this.request(path).then((data) => {
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(path, { data, expires: Date.now() + 5 * 60_000 });
      return data;
    }).finally(() => this.pending.delete(path));
    this.pending.set(path, task);
    return task as Promise<T>;
  }
  private async request(path: string, body?: object): Promise<unknown> {
    if (this.blockedUntil > Date.now()) throw new ApiError("Openverse is limiting requests. Try again after the cooldown.", 429, this.blockedUntil);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(API_BASE + path, {
        method: body ? "POST" : "GET", credentials: "omit", signal: controller.signal,
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const available = response.headers.get("X-RateLimit-Available-anon_sustained");
      if (available) this.usage = available + " requests available today";
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        const seconds = retry && /^\d+(\.\d+)?$/.test(retry) ? Number(retry) : undefined;
        this.blockedUntil = Math.max(Date.now() + 1_000, seconds !== undefined ? Date.now() + seconds * 1000 : retry ? Date.parse(retry) || Date.now() + 60_000 : Date.now() + 60_000);
        throw new ApiError("Too many Openverse requests. Your results are preserved; try again after the cooldown.", 429, this.blockedUntil);
      }
      const data = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
        const detail = typeof raw.detail === "string" ? raw.detail : raw.detail && typeof raw.detail === "object" ? Object.entries(raw.detail).slice(0, 10).map(([key, value]) => key.replaceAll("_", " ") + ": " + (Array.isArray(value) ? value.filter((v) => typeof v === "string").join(" ") : typeof value === "string" ? value : "Invalid value")).join(" · ").slice(0, 1500) : typeof raw.error === "string" ? raw.error : "";
        throw new ApiError(response.status === 404 ? "This sound is no longer available in Openverse." : response.status === 403 ? "Openverse blocked this request. Try opening Openverse directly, or retry later." : detail || "Openverse returned an error (" + response.status + "). Please retry.", response.status);
      }
      if (data == null) throw new ApiError("Openverse returned an unexpected response. Please retry.");
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(controller.signal.aborted ? "The request timed out. Please retry." : "Couldn't reach Openverse. Check your connection or open the source directly.");
    } finally { clearTimeout(timeout); }
  }
  async search(request: SearchRequest) { return this.page(await this.get<unknown>("audio/?" + serializeSearch(request))); }
  private page(value: unknown): AudioPage {
    if (!value || typeof value !== "object") throw new ApiError("Unexpected search response.");
    const raw = value as Record<string, unknown>;
    if (!Array.isArray(raw.results) || !["page", "page_size", "page_count", "result_count"].every((k) => typeof raw[k] === "number" && Number.isInteger(raw[k]) && (raw[k] as number) >= 0)) throw new ApiError("Unexpected search response.");
    return {
      page: raw.page as number, page_size: raw.page_size as number, page_count: raw.page_count as number, result_count: raw.result_count as number,
      results: raw.results.map(normalizeAudio), warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    };
  }
  private audioPath(id: string, suffix = "") {
    if (!uuidPattern.test(id)) throw new ApiError("Invalid sound identifier.");
    return "audio/" + id + "/" + suffix;
  }
  async details(id: string, refresh = false): Promise<Audio> {
    const path = this.audioPath(id);
    if (refresh) this.cache.delete(path);
    return normalizeAudio(await this.get(path));
  }
  async related(id: string, refresh = false) {
    const path = this.audioPath(id, "related/");
    if (refresh) this.cache.delete(path);
    return this.page(await this.get(path));
  }
  async waveform(id: string): Promise<number[]> {
    const result = await this.get<{ points?: unknown }>(this.audioPath(id, "waveform/"));
    if (!Array.isArray(result.points)) throw new ApiError("This waveform isn't available.");
    return result.points.filter((n): n is number => typeof n === "number" && Number.isFinite(n)).map((n) => Math.max(0, Math.min(1, n)));
  }
  async sources(): Promise<Source[]> {
    const result = await this.get<unknown>("audio/stats/");
    if (!Array.isArray(result)) throw new ApiError("Unexpected source response.");
    return result.filter((s): s is Source => !!s && typeof s === "object" && typeof s.source_name === "string" && typeof s.display_name === "string" && typeof s.source_url === "string" && (s.media_count === undefined || typeof s.media_count === "number"));
  }
  async report(id: string, reason: "mature" | "dmca" | "other", description: string) {
    if (!["mature", "dmca", "other"].includes(reason) || description.length > 500) throw new ApiError("Invalid report details.");
    return this.request(this.audioPath(id, "report/"), { identifier: id, reason, ...(description.trim() ? { description: description.trim() } : {}) });
  }
}
export const api = new OpenverseClient();
