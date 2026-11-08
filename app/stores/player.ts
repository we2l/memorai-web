import { defineStore } from 'pinia'
import type { Podcast } from '~/types'

/** Positions the server did not get (offline): { podcastId: { position, completed } }, sent on the next sync */
const PENDING_KEY = 'baigi-podcast-progress-pending'
/** PUT /podcasts/{id}/progress while playing (prd-4e-praticar-v3 RF-F8) */
const SYNC_EVERY_MS = 15_000
/** A position this close to the start is not worth resuming from */
const RESUME_MIN_SECONDS = 5
const COMPLETED_AT = 0.95

/** Cards of an episode that still exist: the size of its session (`scope=podcast:`, prd-caderno-f2-recorte RF-F5). */
export function episodeCardsCount(podcast: Podcast | null | undefined): number {
  if (!podcast) return 0
  return podcast.cards_available ?? podcast.card_ids?.length ?? 0
}

type PendingProgress = Record<string, { position: number; completed: boolean }>

/** The offline copy; an entry an older release wrote in another shape is dropped (it would seek to NaN). */
export function readPending(): PendingProgress {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const valid: PendingProgress = {}
    for (const [id, entry] of Object.entries(raw)) {
      const { position, completed } = (entry ?? {}) as { position?: unknown, completed?: unknown }
      if (typeof position === 'number' && Number.isFinite(position) && position >= 0) valid[id] = { position, completed: completed === true }
    }
    return valid
  } catch {
    return {}
  }
}

function writePending(pending: PendingProgress) {
  try {
    if (Object.keys(pending).length) localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    // intencional: sem storage a posição offline só não sobrevive ao recarregar
  }
}

/**
 * The position heard, mirrored on the episode right away (the lists hold the same object the player plays,
 * so "ouvido 40%" moves without a reload; the server keeps the max).
 */
function noteHeard(p: Podcast, seconds: number, completed: boolean) {
  p.listened_seconds = Math.max(p.listened_seconds ?? 0, seconds)
  p.progress = p.duration_seconds ? Math.min(1, p.listened_seconds / p.duration_seconds) : 0
  if (completed || p.progress >= COMPLETED_AT) p.completed_at ??= new Date().toISOString()
}

/** Where an episode starts: the furthest point heard (server, or the offline copy), unless it was finished. */
function resumePosition(p: Podcast): number {
  const heard = Math.max(p.listened_seconds ?? 0, readPending()[p.id]?.position ?? 0)
  return heard < RESUME_MIN_SECONDS || p.completed_at || heard >= (p.duration_seconds || Infinity) * COMPLETED_AT ? 0 : heard
}

/**
 * The one audio element of the app (`#global-audio`, outside the Vue tree) and what plays in it. The
 * position heard lives on the server (PUT /podcasts/{id}/progress every 15 s playing, on pause and on the
 * end), so another device resumes from it; localStorage only keeps what could not be sent.
 */
export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentPodcast: null as Podcast | null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    expanded: false,
    playbackRate: 1,
    /** Seconds to seek once the metadata of the new source loads */
    pendingSeek: 0,
    lastSyncAt: 0,
  }),

  getters: {
    hasEnded: (state) => !state.isPlaying && state.currentTime > 0 && state.duration > 0 && state.currentTime >= state.duration - 1,
  },

  actions: {
    play(podcast: Podcast) {
      if (!podcast.audio_url) return
      const audio = this.getAudio()
      if (this.currentPodcast?.id !== podcast.id) {
        if (this.currentPodcast && this.currentTime > 0) void this.syncProgress()
        this.currentPodcast = podcast
        this.currentTime = 0
        this.duration = podcast.duration_seconds ?? 0
        this.pendingSeek = resumePosition(podcast)
        audio.src = podcast.audio_url
        audio.load()
      }
      audio.playbackRate = this.playbackRate
      this.lastSyncAt = Date.now()
      void audio.play()?.catch?.(() => { this.isPlaying = false })
      this.isPlaying = true
      this._updateMediaSession()
    },

    pause() {
      this.getAudio().pause()
      this.isPlaying = false
      void this.syncProgress()
    },

    resume() {
      if (this.currentPodcast) this.play(this.currentPodcast)
    },

    togglePlay() {
      if (this.isPlaying) this.pause()
      else this.resume()
    },

    seek(time: number) {
      const audio = this.getAudio()
      const target = Math.max(0, Math.min(time, this.duration || time))
      audio.currentTime = target
      this.currentTime = target
    },

    setRate(rate: number) {
      this.playbackRate = rate
      this.getAudio().playbackRate = rate
    },

    skip(seconds: number) {
      this.seek(this.getAudio().currentTime + seconds)
    },

    expand() { this.expanded = true },
    collapse() { this.expanded = false },

    /** The account changed: silence the audio without sending its position (the session is gone). */
    release() {
      if (!this.currentPodcast) return
      const audio = this.getAudio()
      audio.pause()
      audio.removeAttribute('src')
    },

    stop() {
      if (this.currentPodcast && this.currentTime > 0) void this.syncProgress()
      const audio = this.getAudio()
      audio.pause()
      audio.removeAttribute('src')
      this.currentPodcast = null
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.expanded = false
      this.pendingSeek = 0
    },

    /**
     * PUT /podcasts/{id}/progress (204; the server keeps the furthest point and marks ≥ 95% as heard). A
     * failure keeps the position in localStorage and the next sync sends it.
     */
    async syncProgress(completed = false) {
      const podcast = this.currentPodcast
      const pending = readPending()
      const position = Math.floor(this.currentTime)
      if (podcast && (position > 0 || completed)) {
        this.lastSyncAt = Date.now()
        pending[podcast.id] = { position: Math.max(position, pending[podcast.id]?.position ?? 0), completed: completed || !!pending[podcast.id]?.completed }
        noteHeard(podcast, position, completed)
      }
      if (!Object.keys(pending).length) return
      const { $api } = useNuxtApp()
      for (const [id, p] of Object.entries(pending)) {
        try {
          await $api(`/podcasts/${id}/progress`, { method: 'PUT', body: { position_seconds: p.position, ...(p.completed ? { completed: true } : {}) } })
          delete pending[id]
        } catch (e) {
          // 404 = the episode is gone; anything else (offline) waits for the next sync
          if ((e as { status?: number })?.status === 404) delete pending[id]
        }
      }
      writePending(pending)
    },

    _onEnded() {
      const podcast = this.currentPodcast
      this.isPlaying = false
      if (!podcast) return
      this.currentTime = this.duration || this.currentTime
      void this.syncProgress(true)
      useAnalytics().track('podcast_completed', { origin: podcast.origin === 'daily' ? 'daily' : 'manual' })
    },

    _updateMediaSession() {
      if (!('mediaSession' in navigator) || !this.currentPodcast) return
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentPodcast.title,
        artist: 'Baigi',
        album: this.currentPodcast.topic_name || 'Podcast de revisão',
      })
      navigator.mediaSession.setActionHandler('play', () => this.resume())
      navigator.mediaSession.setActionHandler('pause', () => this.pause())
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skip(-15))
      navigator.mediaSession.setActionHandler('seekforward', () => this.skip(15))
    },

    getAudio(): HTMLAudioElement {
      if (typeof document === 'undefined') return new Audio()
      let el = document.getElementById('global-audio') as HTMLAudioElement | null
      if (!el) {
        const audio = document.createElement('audio')
        audio.id = 'global-audio'
        audio.preload = 'metadata'
        document.body.appendChild(audio)
        audio.addEventListener('timeupdate', () => {
          this.currentTime = audio.currentTime
          if (this.isPlaying && Date.now() - this.lastSyncAt >= SYNC_EVERY_MS) void this.syncProgress()
        })
        audio.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) this.duration = Math.floor(audio.duration)
          if (this.pendingSeek > 0) {
            audio.currentTime = this.pendingSeek
            this.currentTime = this.pendingSeek
            this.pendingSeek = 0
          }
        })
        audio.addEventListener('ended', () => this._onEnded())
        el = audio
      }
      return el
    },
  },
})
