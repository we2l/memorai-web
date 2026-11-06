import type { DeletePreview, TrashBatch, TrashCounts } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'

/**
 * What a refused move or restore says (prd-4b-caderno-v3 §5.2): the API answers with a `code`, the screen says
 * why in plain words and points to the next step. Never the raw 422.
 */
export interface OrganizationErrorView {
  code: string
  message: string
  next?: { label: string; to: string }
}

interface ExamRequirement { exam?: { id: string; title: string; exam_date: string } }

const TRASH_PATH = '/cadernos/lixeira'
const EXAMS_PATH = '/progresso#provas'

const examDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function examText(requirement?: ExamRequirement): string {
  const exam = requirement?.exam
  if (!exam) return 'Uma prova'
  const date = new Date(`${exam.exam_date}T12:00:00Z`)
  return `A prova “${exam.title}”${Number.isNaN(date.getTime()) ? '' : ` (${examDate.format(date)})`}`
}

/** The view of a refused move or restore; null when the error has no known code (the caller's own text). */
export function organizationError(e: unknown, action: 'move' | 'restore' = 'move'): OrganizationErrorView | null {
  const err = e as { data?: { code?: string; requirement?: ExamRequirement }; response?: { _data?: { code?: string; requirement?: ExamRequirement } } } | null
  const data = err?.data ?? err?.response?._data
  const status = getErrorStatus(e)
  if (status !== 422 && status !== 409) return null
  switch (data?.code) {
    case 'cycle':
      return { code: data.code, message: 'Não dá para mover para dentro dele mesmo. Escolha um destino fora deste item.' }
    case 'depth_exceeded':
      return { code: data.code, message: 'Aí passaria de 2 níveis (matéria e assunto). Escolha um destino mais acima.' }
    case 'part_of_document':
      return { code: data.code, message: 'Esta nota é uma parte de um PDF. Mova o PDF inteiro pela lista de materiais do caderno.' }
    case 'destination_in_trash':
      return { code: data.code, message: 'O destino está na lixeira. Restaure-o ou escolha outro.', next: { label: 'Abrir a lixeira', to: TRASH_PATH } }
    case 'exam_coverage':
      return {
        code: data.code,
        message: action === 'restore'
          ? `${examText(data.requirement)} cobre este conteúdo junto com outro caderno. Edite a cobertura da prova e restaure de novo.`
          : `${examText(data.requirement)} cobre esta matéria junto com outras do caderno. Tire a matéria da prova e mova de novo.`,
        next: { label: 'Ver a prova', to: EXAMS_PATH },
      }
    case 'parent_in_trash':
      return { code: data.code, message: 'O lugar de origem também está na lixeira. Restaure-o primeiro.', next: { label: 'Abrir a lixeira', to: TRASH_PATH } }
    default:
      return null
  }
}

const nf = new Intl.NumberFormat('pt-BR')
export const countOf = (n: number, one: string, many: string) => `${nf.format(n)} ${n === 1 ? one : many}`

function listOf(parts: string[]): string {
  if (parts.length < 2) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}

/**
 * What goes along: "8 matérias e assuntos, 14 materiais e 2.200 cards". `depth` = where the item sits: inside a
 * caderno (0) there are matérias and assuntos; inside a matéria, only assuntos.
 */
export function contentsText(counts: Partial<TrashCounts>, depth = 0): string {
  const parts: string[] = []
  if (counts.subjects) parts.push(depth === 0 ? (counts.subjects === 1 ? '1 matéria' : `${nf.format(counts.subjects)} matérias e assuntos`) : countOf(counts.subjects, 'assunto', 'assuntos'))
  if (counts.parts) parts.push(countOf(counts.parts, 'parte', 'partes'))
  if (counts.materials) parts.push(countOf(counts.materials, 'material', 'materiais'))
  if (counts.cards) parts.push(countOf(counts.cards, 'card', 'cards'))
  return listOf(parts)
}

/** "Vão junto 8 matérias e 2.200 cards"; empty with nothing inside. */
export function goesAlongText(counts: Partial<TrashCounts>, depth = 0): string {
  const contents = contentsText(counts, depth)
  if (!contents) return ''
  const total = (counts.subjects ?? 0) + (counts.parts ?? 0) + (counts.materials ?? 0) + (counts.cards ?? 0)
  return `${total === 1 ? 'Vai junto' : 'Vão junto'} ${contents}`
}

/** The sentence of the dialog: "Vão junto 8 matérias… Você pode restaurar por 30 dias." */
export function trashMessage(counts: Partial<TrashCounts>, depth = 0): string {
  const lead = goesAlongText(counts, depth)
  return `${lead ? `${lead}. ` : ''}Você pode restaurar por 30 dias.`
}

/** What a line of the trash contains: in a note or PDF, `materials` is the item itself and says nothing. */
export function batchCounts(batch: Pick<TrashBatch, 'kind' | 'counts'>): Partial<TrashCounts> {
  return batch.kind === 'topic' ? batch.counts : { cards: batch.counts.cards }
}

/** What stays outside the trash: simulados and episodes stay in the library with a label (RF-B8). */
export function keepsText(preview: Pick<DeletePreview, 'quizzes' | 'podcasts'> | null): string {
  if (!preview) return ''
  const parts: string[] = []
  if (preview.quizzes) parts.push(countOf(preview.quizzes, 'simulado', 'simulados'))
  if (preview.podcasts) parts.push(countOf(preview.podcasts, 'episódio', 'episódios'))
  if (!parts.length) return ''
  return `${listOf(parts)} ${preview.quizzes + preview.podcasts === 1 ? 'continua' : 'continuam'} na biblioteca, com o aviso de que o caderno está na lixeira.`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "apaga em 23 dias": the days left, rounded up (the trash:purge job runs at 04:30 of São Paulo). */
export function purgeText(purgeAt: string, now = Date.now()): string {
  const days = Math.ceil((new Date(purgeAt).getTime() - now) / DAY_MS)
  if (days <= 0) return 'apaga hoje'
  if (days === 1) return 'apaga amanhã'
  return `apaga em ${nf.format(days)} dias`
}

/** A line of the trash: its type, by what it was and where it sat. */
export function trashKindLabel(batch: Pick<TrashBatch, 'kind' | 'origin'>): string {
  if (batch.kind === 'document') return 'PDF'
  if (batch.kind === 'note') return 'Nota'
  return batch.origin ? 'Matéria ou assunto' : 'Caderno'
}

/** A caderno with this many cards asks for its name before going for good (RN-UX-08, now on the irreversible step). */
export const BIG_CADERNO_CARDS = 50
