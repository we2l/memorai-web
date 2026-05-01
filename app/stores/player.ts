import { defineStore } from 'pinia'
import type { Podcast } from '~/types'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentPodcast: null as Podcast | null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    expanded: false,
    playbackRate: 1,
  }),

  actions: {
    play(podcast: Podcast) {
      const audio = this.getAudio()
      if (this.currentPodcast?.id !== podcast.id) {
        this.currentPodcast = podcast
        audio.src = podcast.audio_url!
        audio.load()
      }
      audio.playbackRate = this.playbackRate
      audio.play()
      this.isPlaying = true
    },

    pause() {
      this.getAudio().pause()
      this.isPlaying = false
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
    },

    getAudio(): HTMLAudioElement {
      if (typeof document === 'undefined') return new Audio()
      let el = document.getElementById('global-audio') as HTMLAudioElement
      if (!el) {
        el = document.createElement('audio')
        el.id = 'global-audio'
        el.preload = 'metadata'
        document.body.appendChild(el)
        el.addEventListener('timeupdate', () => { this.currentTime = Math.floor(el.currentTime) })
        el.addEventListener('loadedmetadata', () => { this.duration = Math.floor(el.duration) })
        el.addEventListener('ended', () => { this.isPlaying = false })
      }
      return el
    },
  },
})
