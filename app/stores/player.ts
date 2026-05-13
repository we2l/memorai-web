import { defineStore } from 'pinia'
import type { Podcast } from '~/types'

const STORAGE_KEY = 'memorai_player_position'

interface SavedPosition {
  podcastId: string
  currentTime: number
  currentIndex: number
  sessionId: string | null
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentPodcast: null as Podcast | null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    expanded: false,
    playbackRate: 1,
    queue: [] as Podcast[],
    currentIndex: 0,
    sessionId: null as string | null,
  }),

  getters: {
    hasNext: (state) => state.currentIndex < state.queue.length - 1,
    hasPrev: (state) => state.currentIndex > 0,
    isPlaylist: (state) => state.queue.length > 1,
    episodeLabel: (state) => state.queue.length > 1
      ? `${state.currentIndex + 1}/${state.queue.length}`
      : null,
  },

  actions: {
    play(podcast: Podcast) {
      this.queue = [podcast]
      this.currentIndex = 0
      this.sessionId = podcast.session_id || null
      this._playCurrentIndex()
    },

    playSession(podcasts: Podcast[]) {
      const ready = podcasts.filter(p => p.status === 'ready' && p.audio_url)
        .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      if (!ready.length) return
      this.queue = ready
      this.currentIndex = 0
      this.sessionId = ready[0].session_id || null
      this._restorePosition()
      this._playCurrentIndex()
    },

    next() {
      if (!this.hasNext) return
      this.currentIndex++
      this._playCurrentIndex()
    },

    prev() {
      if (!this.hasPrev) return
      this.currentIndex--
      this._playCurrentIndex()
    },

    pause() {
      this.getAudio().pause()
      this.isPlaying = false
      this._savePosition()
    },

    resume() {
      const audio = this.getAudio()
      audio.playbackRate = this.playbackRate
      audio.play()
      this.isPlaying = true
    },

    togglePlay() {
      this.isPlaying ? this.pause() : this.resume()
    },

    seek(time: number) {
      const audio = this.getAudio()
      audio.currentTime = time
      this.currentTime = time
    },

    setRate(rate: number) {
      this.playbackRate = rate
      this.getAudio().playbackRate = rate
    },

    skip(seconds: number) {
      const audio = this.getAudio()
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, this.duration))
    },

    expand() { this.expanded = true },
    collapse() { this.expanded = false },

    stop() {
      const audio = this.getAudio()
      audio.pause()
      audio.src = ''
      this.currentPodcast = null
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.expanded = false
      this.queue = []
      this.currentIndex = 0
      this.sessionId = null
      this._clearPosition()
    },

    _playCurrentIndex() {
      const podcast = this.queue[this.currentIndex]
      if (!podcast?.audio_url) return
      const audio = this.getAudio()
      if (this.currentPodcast?.id !== podcast.id) {
        this.currentPodcast = podcast
        audio.src = podcast.audio_url
        audio.load()
      }
      audio.playbackRate = this.playbackRate
      audio.play()
      this.isPlaying = true
      this._updateMediaSession()
    },

    _onEnded() {
      this._clearPosition()
      if (this.hasNext) {
        this.next()
      } else {
        this.isPlaying = false
      }
    },

    _savePosition() {
      if (!this.currentPodcast) return
      const data: SavedPosition = {
        podcastId: this.currentPodcast.id,
        currentTime: this.currentTime,
        currentIndex: this.currentIndex,
        sessionId: this.sessionId,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },

    _restorePosition() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const saved: SavedPosition = JSON.parse(raw)
        if (saved.sessionId === this.sessionId) {
          const idx = this.queue.findIndex(p => p.id === saved.podcastId)
          if (idx >= 0) {
            this.currentIndex = idx
            // Will seek after loadedmetadata
            this._pendingSeek = saved.currentTime
          }
        }
      } catch { /* ignore */ }
    },

    _clearPosition() {
      localStorage.removeItem(STORAGE_KEY)
    },

    _updateMediaSession() {
      if (!('mediaSession' in navigator) || !this.currentPodcast) return
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentPodcast.title,
        artist: 'Memorai',
        album: this.currentPodcast.topic_name || 'Podcast de Revisão',
      })
      navigator.mediaSession.setActionHandler('play', () => this.resume())
      navigator.mediaSession.setActionHandler('pause', () => this.pause())
      navigator.mediaSession.setActionHandler('nexttrack', this.hasNext ? () => this.next() : null)
      navigator.mediaSession.setActionHandler('previoustrack', this.hasPrev ? () => this.prev() : null)
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skip(-15))
      navigator.mediaSession.setActionHandler('seekforward', () => this.skip(15))
    },

    _pendingSeek: 0 as unknown as number,

    getAudio(): HTMLAudioElement {
      if (typeof document === 'undefined') return new Audio()
      let el = document.getElementById('global-audio') as HTMLAudioElement
      if (!el) {
        el = document.createElement('audio')
        el.id = 'global-audio'
        el.preload = 'metadata'
        document.body.appendChild(el)
        el.addEventListener('timeupdate', () => {
          this.currentTime = el.currentTime
          // Save position every 10s
          if (Math.floor(el.currentTime) % 10 === 0 && Math.floor(el.currentTime) > 0) {
            this._savePosition()
          }
        })
        el.addEventListener('loadedmetadata', () => {
          this.duration = Math.floor(el.duration)
          if (this._pendingSeek > 0) {
            el.currentTime = this._pendingSeek
            this._pendingSeek = 0
          }
        })
        el.addEventListener('ended', () => this._onEnded())
      }
      return el
    },
  },
})
