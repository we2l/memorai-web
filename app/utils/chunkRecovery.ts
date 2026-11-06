/** sessionStorage key with the time of the last reload made to recover from a missing chunk (plugins/chunk-recovery). */
export const CHUNK_RELOAD_KEY = 'baigi-chunk-reload'
/** A second chunk failure within this window is not an old release: no new reload (no loop). */
export const RELOAD_WINDOW_MS = 60_000

// Chrome/Edge, Firefox, Safari and Vite's own CSS preload wording
const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk .+ failed|expected a JavaScript(-or-Wasm)? module script/i

/** A failed lazy import (a chunk of another release), whatever wraps it (NuxtError, Error, string). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const message = typeof error === 'string' ? error : String((error as { message?: unknown }).message ?? '')
  return CHUNK_ERROR.test(message)
}

/**
 * Whether to reload now: only when no recovery reload happened in the last RELOAD_WINDOW_MS. Records the attempt.
 * Without sessionStorage (blocked) never reloads: there would be no guard against a loop.
 */
export function shouldReloadForChunk(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY))
    if (Number.isFinite(last) && last > 0 && now - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
    return true
  } catch {
    return false
  }
}
