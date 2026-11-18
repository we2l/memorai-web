/**
 * The real sample of the podcast (public/landing/podcast-amostra.mp3, 50 s, uncut) and its transcript: the opening of
 * the episode, the hook from the student's own errors, the question, a pause with a tick a second while you answer in
 * your head (ADR-029), the answer and the line to fix it. The first 50 s of a real episode of 5 Português cards (crase
 * before place names) generated in e2e-landing-podcast@audit.test, chosen by the owner on 18/11. The times of the
 * lines match the silences of the file (ffmpeg silencedetect, 18/11); `tick` = the first tick of the pause. The landing
 * plays it with its waveform (utils/landing.ts SAMPLE), step 5 of the /comecar tour with its bars (utils/entrada.ts
 * ENTRY_SAMPLE), the podcast paywall of the app in PodcastSample.
 */
export type SampleLineKind = 'intro' | 'question' | 'pause' | 'answer'

/** The ticks of the pause: one a second, "4, 3, 2, 1" on the screen (podcast-tts PODCAST_RECALL_PAUSE_SECONDS). */
export const SAMPLE_COUNTDOWN = 4

export const PODCAST_SAMPLE = {
  src: '/landing/podcast-amostra.mp3',
  duration: 50.3,
  title: 'Seus erros de Português',
  topic: 'Concurso, ENEM, OAB',
  lines: [
    { t: 0.1, text: 'Hoje você vai revisar cinco cards de Português, e os cinco já te pegaram antes, então aproveite para olhar de novo para cada um e testar o que você lembra.', kind: 'intro' },
    { t: 8.8, text: 'Eu faço a pergunta, deixo uma pausa com um tique para você responder de cabeça e depois trago a resposta, para você comparar com a sua.', kind: 'intro' },
    { t: 16.9, text: 'Bora começar pelo primeiro card.', kind: 'intro' },
    { t: 19.2, text: 'Essa aqui te pegou duas vezes no último mês.', kind: 'question' },
    { t: 22.6, text: 'Quando há crase antes de nome de lugar? Tenta lembrar.', kind: 'question' },
    { t: 26.1, text: '(pausa pra você responder de cabeça)', kind: 'pause', tick: 26.9 },
    { t: 30.5, text: 'Quando o lugar aceita artigo. Troque ir por voltar: quem volta da Bahia vai à Bahia, com crase; quem volta de Curitiba vai a Curitiba, sem crase.', kind: 'answer' },
    { t: 43.8, text: 'Volto da, crase há; volto de, crase pra quê?', kind: 'answer' },
    { t: 47.7, text: 'Bahia com crase, Curitiba sem crase.', kind: 'answer' },
  ] as { t: number, text: string, kind: SampleLineKind, tick?: number }[],
}

/** The line being spoken at `seconds` (the first one before the voice starts). */
export function sampleLineAt(seconds: number): number {
  return PODCAST_SAMPLE.lines.reduce((cur, line, i) => (seconds >= line.t ? i : cur), 0)
}

/** "0:07" */
export function sampleClock(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

/**
 * The countdown of the pause at `seconds`: 4, 3, 2, 1 (one number per tick of the file), or null outside the pause.
 * The number changes on each tick, from the first one (`tick`); before it the pause already shows 4.
 */
export function sampleCountdownAt(seconds: number): number | null {
  const line = PODCAST_SAMPLE.lines[sampleLineAt(seconds)]
  if (!line || line.kind !== 'pause' || seconds < line.t) return null
  return Math.min(SAMPLE_COUNTDOWN, Math.max(1, SAMPLE_COUNTDOWN - Math.floor(seconds - (line.tick ?? line.t))))
}
