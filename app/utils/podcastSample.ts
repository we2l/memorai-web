/**
 * The real sample of the podcast (public/landing/podcast-amostra.mp3, 20 s) and its transcript: the hook from the
 * student's own errors, the question, a pause with a tick while you answer in your head (ADR-029), the answer and the
 * line to fix it. The times of the lines match the silences of the file (ffmpeg silencedetect, 09/11). The first card
 * of an episode of 5 cards of Seguridade Social generated with the "roteiro vivo" (api feature/podcast-roteiro-vivo)
 * in e2e-landing-podcast@audit.test (docs/research/landing-personas-2026-11.md). The landing plays it with its waveform (utils/landing.ts SAMPLE); the
 * podcast paywall of the app plays it in PodcastSample.
 */
export const PODCAST_SAMPLE = {
  src: '/landing/podcast-amostra.mp3',
  duration: 19.8,
  title: 'Seus erros de Seguridade Social',
  topic: 'Concurso INSS',
  lines: [
    { t: 0.1, text: 'Essa aqui te pegou duas vezes no último mês.', kind: 'question' },
    { t: 2.6, text: 'Qual é a carência do auxílio por incapacidade temporária? Tenta lembrar.', kind: 'question' },
    { t: 6.3, text: '(pausa pra você responder de cabeça)', kind: 'pause' },
    { t: 10.6, text: 'Doze contribuições mensais, artigo 25, inciso I, da Lei 8.213.', kind: 'answer' },
    { t: 18.4, text: 'Doze contribuições: um ano pagando.', kind: 'answer' },
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
