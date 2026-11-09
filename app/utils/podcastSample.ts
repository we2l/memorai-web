/**
 * The real sample of the podcast (public/landing/podcast-amostra.mp3, 22 s) and its transcript: the question, a
 * pause with a tick while you answer in your head (ADR-029), then the answer. The times of the lines match the
 * silences of the file (ffmpeg silencedetect, 07/11). The card is the one of the landing's hero clip
 * (auxílio-acidente), from an episode of 5 cards of Seguridade Social generated in an @audit.test account
 * (docs/research/landing-personas-2026-11.md). The landing plays it with its waveform (utils/landing.ts SAMPLE); the
 * podcast paywall of the app plays it in PodcastSample.
 */
export const PODCAST_SAMPLE = {
  src: '/landing/podcast-amostra.mp3',
  duration: 22.4,
  title: 'Seus erros de Seguridade Social',
  topic: 'Concurso INSS',
  lines: [
    { t: 0.7, text: 'Você sabia que existem diferentes tipos de auxílios financeiros? Quanto vale o auxílio-acidente?', kind: 'question' },
    { t: 7, text: 'Pensa um pouco antes de eu responder.', kind: 'question' },
    { t: 8.2, text: '(pausa pra você responder de cabeça)', kind: 'pause' },
    { t: 12.8, text: '50% do salário de benefício, pago como indenização, conforme o artigo 86, parágrafo 1º, da Lei 8.213 de 1991.', kind: 'answer' },
  ] as { t: number, text: string, kind: 'question' | 'pause' | 'answer' }[],
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
