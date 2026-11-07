import type { StudyGate } from '~/utils/studyRequirement'

export interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  plan: string
  default_learning_mode: string
  subscription_status?: SubscriptionStatus | null
  onboarding_completed: boolean
  /** ISO 8601. Older API builds omit it (the activation checklist then stays hidden). */
  created_at?: string
  /** First batch of the account concluded: the activation (prd-4g-conta-onboarding-v3 RF-B3) */
  first_batch_at?: string | null
  /** Cards per batch, 10 | 20 | 30 (Configurações → Estudo); older API builds omit it (20) */
  review_batch_size?: number
  /** False for Google sign-ups that never defined a password (RF-B3). */
  has_password?: boolean
  /** The account has a Google identity (api #133; the id itself never comes) */
  google_linked?: boolean
  /** Next charge of the monthly. Null on the annual, the Free and a canceled subscription; absent on older API builds */
  subscription_renews_at?: string | null
  /** LGPD analytics consent: null = not decided (prd-analytics-posthog RF-B03). */
  analytics_consent?: boolean | null
  analytics_consent_at?: string | null
  /** Intensivo trial without a card (prd-planos-lancamento §4): absent on older API builds */
  trial?: UserTrial
}

/** available = never started (opens on the first material or AI use, verified e-mail); active; used = over or never offered */
export type TrialStatus = 'available' | 'active' | 'used'

export interface UserTrial {
  status: TrialStatus
  /** ISO 8601; null while available */
  started_at: string | null
  ends_at: string | null
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface Deck {
  id: string
  name: string
  description: string | null
  cards_count: number
  learning_steps: number[]
  relearning_steps: number[]
  desired_retention: number
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: string
  deck_id: string
  topic_id?: string | null
  source_note_id?: string | null
  /** The pasted question the card was made from (prd-questao-errada) */
  source_question_id?: string | null
  tags: string[]
  type: string
  cloze_index?: number | null
  cloze_group_id?: string | null
  front: string
  front_audio_url: string | null
  back: string
  back_audio_url: string | null
  state: string
  due: string | null
  stability: number
  difficulty: number
  reps: number
  lapses: number
  learning_step_index: number | null
  is_learning: boolean
  created_at: string
  updated_at: string
}

export interface ReviewPayload {
  flashcard_id: string
  rating: 1 | 2 | 3 | 4
}

export interface Stats {
  total_cards: number
  total_decks: number
  due_today: number
  reviewed_today: number
  cards_reviewed_today: number
  streak: number
  /** Studied yesterday (Brasília) and not yet today. */
  streak_at_risk?: boolean
  /** Longest streak ever (prd-4d-revisao-v3 RF-B2); never below `streak` */
  streak_longest?: number
  /** Studied today already (the streak counts today) */
  streak_extended_today?: boolean
  ratings_today: {
    again: number
    hard: number
    good: number
    easy: number
  }
  /** Goal of the day in batches of the user's size (prd-4a-hoje-v3 RF-B1); older API builds omit it. */
  goal?: DayGoal
}

/** GET /stats → goal. With nothing due today the API reports the goal as met (done = target). */
export interface DayGoal {
  batch_size: number
  target_batches: number
  done_batches: number
  met: boolean
  minutes_left: number
}

/** GET /stats/pending-actions (prd-4a-hoje-v3 RF-B3): `url` kept for older clients. */
export interface PendingAction {
  type: 'errors' | 'pdf_ready' | 'weak_topic'
  label: string
  action_label: string
  url: string
  topic_id?: string | null
  document_id?: string | null
}

/** GET /notes/recent (prd-4a-hoje-v3 RF-B4): last notes opened or edited, without content. */
export interface RecentNote {
  id: string
  title: string
  topic: { id: string; name: string }
  root: { id: string; name: string; color: string | null }
  source_document_id: string | null
  /** coalesce(last_opened_at, updated_at) */
  opened_at: string
}

export interface NavItem {
  label: string
  to: string
  icon: string
}

export interface Topic {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  position: number
  color: string | null
  learning_mode: string | null
  target_language: string | null
  source_language: string | null
  language_level: string | null
  notes_count: number
  flashcards_count: number
  children: Topic[]
  created_at: string
  updated_at: string
}

/**
 * Note as listed by GET /topics/{id}/notes and returned by PUT /notes/{id}: no Tiptap content
 * (prd-performance-caderno RF-B1/RF-B3). `plain_preview` is null until the embedding job runs.
 */
export interface NoteSummary {
  id: string
  topic_id: string
  title: string
  word_count: number
  plain_preview: string | null
  /** Only in the list (the PUT answer does not count the cards) */
  flashcards_count: number
  source_document_id: string | null
  /** Only in the list: size of its session (`scope=note:`, prd-caderno-f2-recorte RF-B4) */
  session_count?: number
  last_ai_transform_at: string | null
  cards_generated_at: string | null
  created_at: string
  updated_at: string
}

/** GET /notes/{id} and POST /topics/{id}/notes: the summary plus the content. */
export interface Note extends NoteSummary {
  content: Record<string, any> | null
}

export interface TopicDetails {
  id: string
  name: string
  progress: number
  flashcards_count: number
  notes_count: number
  review_count: number
  weak_count: number
  due_count: number
  new_count: number
  learning_count: number
  /** Size of the review session GET /review/session?topic_id= would build now ("Revisar N") */
  session_count: number
  /** What the subtree still needs for a quiz / a podcast (prd-caderno-f1-pontes RF-B6) */
  can_quiz?: StudyGate
  can_podcast?: StudyGate
  streak: number
  evolution: { mastered: number; recovered: number; total: number }
  goal: { target_date: string; cards_per_day: number; remaining: number; days_left: number } | null
}

/** GET /topics/progress: every number is of the topic's subtree, the same rule as its session (F1 D1) */
export interface TopicProgress {
  id: string
  /** null = caderno (root); the list is flat, subjects included (prd-4a-hoje-v3 RF-B2) */
  parent_id?: string | null
  name: string
  color?: string | null
  /** Notes of the whole subtree */
  notes_count?: number
  /** The sample caderno of the onboarding (prd-4g-conta-onboarding-v3 RF-F9) */
  is_sample?: boolean
  flashcards_count: number
  review_count: number
  progress: number
  /** Size of the session of that subtree ("Revisar N"), with the daily limits */
  session_count: number
  /** Same value as session_count (kept by the API for older clients) */
  pending_count?: number
  last_reviewed_at?: string | null
  updated_at?: string
}

/** Numbers of each tree row, by topic id: all of the subtree, from GET /topics/progress */
export type TreeProgressMap = Record<string, Pick<TopicProgress, 'progress' | 'session_count' | 'flashcards_count'>>

export interface WeakConnection {
  id: string
  name: string
  progress: number
}

export interface ErrorLog {
  id: string
  flashcard_id: string
  review_id: string
  reason: 'confused' | 'didnt_know' | 'forgot' | 'silly_mistake'
  note: string | null
  created_at: string
}


export interface UserSettings {
  daily_new_cards_limit: number | null
  daily_review_limit: number | null
  session_time_limit: number | null
  survival_mode: boolean
  default_learning_mode?: string
  desired_retention?: number
  error_diary_mode?: 'always' | 'sometimes' | 'never'
  // Study e-mails (prd-retencao-lembretes F1): hour 6–22, America/Sao_Paulo
  reminder_enabled?: boolean
  reminder_hour?: number
  email_suppressed?: boolean
  /** "Episódio da manhã" (prd-4e-praticar-v3 RF-B11): only Pro can turn it on (422 pro_only) */
  daily_episode?: boolean
  daily_goal_batches?: number
  /** Cards per batch: 10, 20 (default) or 30 */
  review_batch_size?: number
}

/** GET /review/tomorrow (prd-retencao-lembretes §4.3). Dates in America/Sao_Paulo. */
export interface TomorrowForecast {
  date: string
  due_count: number
  review_count: number
  new_count: number
  estimated_minutes: number
  streak: { current: number; reviewed_today: boolean; at_risk: boolean; next_milestone: number | null }
  reminder: { enabled: boolean; hour: number; suppressed: boolean }
}

export interface BacklogStats {
  overdue_count: number
  due_today_count: number
  new_available_count: number | null
  estimated_minutes: number
  reviews_done_today: number
  new_cards_done_today: number
  suggest_survival_mode: boolean
}

export interface ErrorPatterns {
  patterns: Record<string, number>
  total_errors: number
  top_cards: { id: string; front: string; lapses: number }[]
}

export interface NoteSnippet {
  note_id: string
  title: string
  snippet: string
  topic_id: string
}

// Anki Import
export interface AnkiImportDeckPreview {
  name: string
  cards_count: number
  conflict: boolean
}

export interface AnkiImportPreview {
  decks: AnkiImportDeckPreview[]
  total_notes: number
  total_cards: number
  tags: string[]
  media_count: number
  note_types: { Basic: number; Cloze: number; Other: number }
  /** How the decks become cadernos (prd-4b-caderno-v3 RF-B9); null on a preview from before the 4b-2 */
  mapping?: AnkiImportMapping | null
}

export interface AnkiMappingMateria { name: string; cards: number; assuntos: { name: string; cards: number }[] }

export interface AnkiImportMapping {
  destination: { type: AnkiDestinationType; topic_id?: string }
  caderno: string | null
  materias: AnkiMappingMateria[]
  cadernos: { name: string; cards: number; materias: AnkiMappingMateria[] }[]
  /** Deep paths (4th level on) and Anki tags that become tags of the cards */
  deep_paths: number
  tags: number
  cards: number
}

export type AnkiDestinationType = 'new' | 'existing'

export interface AnkiImportStatus {
  status: 'pending' | 'previewing' | 'confirmed' | 'processing' | 'completed' | 'failed'
  current_step?: string
  total_cards?: number
  imported_cards?: number
  progress_percent?: number
  stats?: { decks_created: number; cards_created: number; topics_created: number; media_extracted: number }
  /** The caderno created or used (the first, with many root decks) */
  root_topic_id?: string | null
  root_topic_ids?: string[]
  error?: string
}

/** Trash of 30 days (prd-4b-caderno-v3 RF-B8). */
export interface TrashCounts {
  subjects: number
  materials: number
  cards: number
  /** Parts of a PDF: only the dialog of a PDF has them, from its line */
  parts?: number
}

export interface TrashBatch {
  id: string
  kind: 'topic' | 'note' | 'document'
  item_id: string
  title: string
  deleted_at: string
  purge_at: string
  counts: Partial<TrashCounts>
  /** Where it comes back to (null: a caderno); in_trash = that one has to come back first */
  origin?: { id: string; name: string; in_trash: boolean } | null
}

export interface DeletePreview extends Required<Omit<TrashCounts, 'parts'>> {
  reviews: number
  quizzes: number
  podcasts: number
}

export interface TrashReceipt {
  trash_batch_id: string
  purge_at: string
  counts: Partial<TrashCounts>
}

export interface FeatureData {
  used: number
  limit: number | null
  remaining: number | null
  /** used >= ceil(limit × 0,8) with a numeric limit (prd-uso-justo RF-B3); absent on an older API */
  near_limit?: boolean
}

export interface FeatureUsageData {
  plan: string
  /** free | trial | pro: in the trial the period is the trial window (prd-planos-lancamento §4) */
  tier?: 'free' | 'trial' | 'pro'
  /** month | trial | lifetime (the Free's preview, prd-uso-justo §9): absent on an older API */
  period?: 'month' | 'trial' | 'lifetime'
  /** null in the preview (lifetime: it never resets) */
  period_start: string | null
  period_end: string | null
  resets_at?: string | null
  features: Record<string, FeatureData>
  /** Pages of PDF read by the AI in the period (the trial's cap: 100) */
  pdf_pages?: FeatureData
}

// Documents (PDF)
export interface Document {
  id: string
  original_name: string
  file_size: number
  pages_count: number | null
  processed_pages: number | null
  status: 'uploaded' | 'pending' | 'processing' | 'completed' | 'failed'
  topic_id: string | null
  chunks_count?: number
  total_chunks?: number | null
  has_generated_note?: boolean
  note_generation_status?: 'generating' | 'completed' | 'failed' | null
  note_generation_progress?: number
  note_total_batches?: number
  topic_tree_generated?: boolean
  study_structure_status?: 'generating' | 'completed' | 'failed' | null
  source_language?: string | null
  language_detected?: boolean
  note_stats?: {
    note_id: string
    sections: number
    gotchas: number
    insights: number
    errors: number
  } | null
  /** PDF → cards (prd-ux-critica RF-B6) */
  note_id?: string | null
  auto_cards?: boolean
  auto_cards_status?: 'pending' | 'generating' | 'completed' | 'failed' | 'skipped_quota' | 'skipped_empty' | null
  auto_cards_count?: number
  /** Size of its session (`scope=document:`) and of "Praticar adiantado" (prd-caderno-f2-recorte RF-B4) */
  session_count?: number
  ahead_count?: number
  /** Mode the note was generated with (the caderno may have changed since) */
  learning_mode_used?: string | null
  created_at: string
}

// AI Cards
export interface AiGeneratedCard {
  front: string
  back: string
  source_reference?: string
}

export interface AiGenerateResult {
  cards: AiGeneratedCard[]
  source: 'free' | 'notes' | 'pdf'
}

// Chat
export interface Conversation {
  id: string
  title: string
  messages_count: number
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatResponse {
  conversation_id: string
  message: {
    role: 'assistant'
    content: string
  }
}


// Podcast
export interface Podcast {
  id: string
  title: string
  status: 'pending' | 'generating_script' | 'generating_audio' | 'ready' | 'failed'
  content_mode?: PodcastContentMode | null
  script?: string
  audio_url?: string | null
  duration_seconds?: number | null
  duration_target?: PodcastDuration | 'long' | null
  tone?: PodcastTone | null
  format?: PodcastFormat | null
  is_teaser?: boolean
  topic_id?: string | null
  topic_name?: string | null
  source_data?: { topic_names?: string[]; card_count?: number; error_count?: number } | null
  card_ids?: string[] | null
  /** How many of card_ids still exist (prd-caderno-f2-recorte RF-B4): "Revisar os N do episódio" */
  cards_available?: number
  timestamps?: { type: string; start_ms: number; end_ms: number; card_index?: number }[] | null
  session_id?: string | null
  episode_number?: number | null
  /** Ouvir v3 (prd-4e-praticar-v3 RF-B7): "daily" = the episódio da manhã (RF-B12) */
  origin?: 'manual' | 'daily'
  /** Furthest point heard, on the server (PUT /podcasts/{id}/progress) */
  listened_seconds?: number
  /** Heard to the end (≥ 95%) */
  completed_at?: string | null
  /** 0–1 */
  progress?: number
  topic_in_trash?: boolean
  /** Only on GET /podcasts/{id} (RF-B8) */
  transcript?: PodcastTranscriptLine[]
  created_at: string
}

/** A line of the transcript: one speech of the debate or a paragraph, with its time in the audio. */
export interface PodcastTranscriptLine {
  speaker: string | null
  text: string
  start_ms: number
  end_ms: number
}

export type PodcastContentMode = 'weak_points' | 'general_review' | 'pre_exam'
// 'teaser' is set by the API for Free; 'long' only exists in legacy rows
export type PodcastDuration = 'teaser' | 'short' | 'medium'
export type PodcastTone = 'formal' | 'conversational' | 'motivational' | 'didactic'
export type PodcastFormat = 'expository' | 'debate'

export interface PodcastSpeakerConfig {
  host1: { name: string; voice: string }
  host2?: { name: string; voice: string }
}

// The 8 Stripe subscription statuses (backend SubscriptionStatus enum)
export type SubscriptionStatus =
  | 'active' | 'past_due' | 'unpaid' | 'canceled'
  | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused'

export interface SubscriptionInfo {
  plan: string
  /** annual wins when both exist (monthly scheduled after the annual) */
  billing: 'annual' | 'monthly' | null
  subscription_status: SubscriptionStatus | null
  subscription_ends_at: string | null
  has_subscription: boolean
  plan_expires_at: string | null
  in_grace_period: boolean
  grace_ends_at: string | null
  can_renew_annual: boolean
  monthly_scheduled: boolean
}

/** GET /api/checkout/sessions/{id} — annual checkout status (Pix waiting page) */
export interface CheckoutSessionInfo {
  session_id: string
  status: 'open' | 'complete' | 'expired'
  payment_status: 'paid' | 'unpaid' | 'no_payment_required' | null
  payment_method: 'pix' | 'card' | null
  pix_qr: { data: string | null; image_url_png: string | null; expires_at: string | null } | null
  plan_active: boolean
  plan_expires_at: string | null
}

// Quiz / Simulados
export interface Quiz {
  id: string
  title: string
  status: 'configuring' | 'in_progress' | 'completed' | 'failed' | 'abandoned'
  mode: 'learning' | 'exam'
  config: QuizConfig
  total_questions: number
  correct_count: number | null
  score_percent: number | null
  time_limit_seconds: number | null
  time_spent_seconds: number | null
  topic?: { id: string; name: string; in_trash?: boolean } | null
  questions?: QuizQuestion[]
  started_at: string | null
  completed_at: string | null
  cards_created_at: string | null
  /** Cards born from the errors (prd-caderno-f2-recorte RF-B6); count 0 = older quiz, without the link */
  cards_from_errors?: { count: number; session_count: number } | null
  /** Praticar v3 (prd-4e-praticar-v3): bateria of a scope or simulado do caderno split by matéria */
  kind?: QuizKind
  scope?: { type: QuizScopeType; id: string } | null
  /** Simulado do caderno: questions by matéria (sums to the quantity asked) */
  distribution?: QuizDistributionRow[] | null
  /** Questions asked − delivered: said on screen, never in silence (RF-B3) */
  shortfall?: number
  /** "Refazer as que errei": the quiz this one copies */
  retry_of?: string | null
  /** Completed quizzes only (GET /quizzes/{id}, RF-B5/B6) */
  by_topic?: QuizTopicResult[]
  previous?: { quiz_id: string; score_percent: number; delta: number } | null
  error_cards_preview?: QuizErrorCard[]
  created_at: string
}

export type QuizKind = 'battery' | 'exam'
export type QuizScopeType = 'topic' | 'document' | 'note'

export interface QuizDistributionRow {
  topic_id: string
  name: string
  questions: number
}

/** Accuracy of one assunto in this quiz and in the history without it (null below 10 answered). */
export interface QuizTopicResult {
  topic_id: string
  name: string
  answered: number
  correct: number
  accuracy: number
  history_accuracy: number | null
}

/** The card a wrong question becomes (the same builder as create-cards, no AI); card_id once created. */
export interface QuizErrorCard {
  question_id: string
  number: number
  topic_id: string | null
  topic_name: string
  front: string
  back: string
  card_id: string | null
}

export interface QuizConfig {
  quantity: number
  types: ('multiple_choice' | 'true_false' | 'short_answer')[]
  difficulty: 'easy' | 'mixed' | 'hard'
  time_limit: number | null
  shortfall?: number
  retry_of?: string
}

export interface QuizQuestion {
  id: string
  position: number
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  difficulty: 'easy' | 'medium' | 'hard'
  stem: string
  options: string[] | null
  topic_tag: string | null
  user_answer: string | null
  is_correct: boolean | null
  correct_answer?: string
  explanation?: string
  ai_feedback?: string | null
  ai_score?: number | null
  answered_at: string | null
  /** Card created from this question's error */
  flashcard_id?: string | null
}

export interface QuizStats {
  total_completed: number
  average_score: number | null
  evolution: Array<{
    id: string
    topic_id: string | null
    score_percent: number
    total_questions: number
    correct_count: number
    completed_at: string
  }>
}

// Exam / Agenda de Provas
export interface Exam {
  id: string
  title: string
  exam_date: string
  /** Stops at 0: on the exam day and after it (is_past tells them apart) */
  days_remaining: number
  /** Before today's study day in São Paulo (api #133) */
  is_past: boolean
  /** How long ago; null while the exam has not passed */
  days_since: number | null
  urgency_color: 'red' | 'yellow' | 'green'
  reta_final_enabled: boolean
  reta_final_active: boolean
  google_calendar_event_id: string | null
  topics: { id: string; name: string }[]
  created_at: string
  /** "Passou?" (prd-retencao-lembretes F6) */
  outcome?: ExamOutcome | null
  outcome_answered_at?: string | null
  /** Agenda (prd-4f-progresso-v3 RF-B2): the topics of the exam with their depth in the caderno */
  coverage?: ExamCoverage[] | null
  cards_per_day?: number | null
  /** Retention on the exam day (RF-B1, §5.1); null without enough data */
  projection?: ExamProjection | null
}

export interface ExamCoverage {
  topic_id: string
  name: string
  depth: number
}

/** What the cards of the coverage keep on the exam day: if the person stops today and if she keeps the pace. */
export interface ExamProjection {
  keep_pace: number
  stop_today: number
  cards: number
  reviewed_cards: number
  new_cards: number
  desired_retention: number
  new_per_day: number
  computed_for: string
}

/** GET /stats/progress?root_id= (prd-4f-progresso-v3 RF-B4) */
export interface ProgressSummaryData {
  mastery: { percent: number | null; in_day: number; cards: number; delta_30d: number | null }
  questions: { answered: number; accuracy: number | null }
  retention_30d: number | null
  streak: number
  streak_longest?: number
}

/** GET /stats/history?days= : only the days with reviews (study day of São Paulo) */
export interface StudyHistory {
  from: string
  to: string
  days: { date: string; reviews: number }[]
  max: number
}

/** GET /stats/day?date= */
export interface StudyDay {
  date: string
  reviews: number
  remembered_percent: number | null
  by_topic: { topic_id: string; name: string; root_name: string | null; reviews: number }[]
  quizzes: { id: string; title: string; score_percent: number | null }[]
  podcasts_completed: { id: string; title: string }[]
}

export type ExamOutcome = 'passed' | 'failed'

/** GET /exams/{id}/outcome-context?t= (public result page) */
export interface ExamOutcomeContext {
  id: string
  title: string
  exam_date: string
  outcome: ExamOutcome | null
  topics: { id: string; name: string }[]
}

export interface ExamUpcoming {
  id: string
  title: string
  exam_date: string
  days_remaining: number
  urgency_color: 'red' | 'yellow' | 'green'
  reta_final_enabled: boolean
  reta_final_active: boolean
  cards_per_day: number
  cards_weak: number
  topics: { id: string; name: string }[]
  podcast_suggestion: boolean
  projection?: ExamProjection | null
}

export interface ExamCalendarDay {
  date: string
  exams: ExamCalendarEntry[]
  total_cards: number
}

export interface ExamCalendarEntry {
  exam_id: string
  title: string
  color: string
  estimated_cards?: number
  is_exam_day: boolean
}

export interface RetaFinalInfo {
  active: boolean
  exam_titles: string[]
  extra_count: number
}

// Offer catalog — GET /api/plans (single source of limits and prices, RN-01)
export type PlanKey = 'free' | 'pro'

export interface PlanPrice {
  amount_cents: number
  label: string
  monthly_equivalent_cents?: number
  installments_max?: number
  savings_cents?: number
}

export interface CatalogPlan {
  key: PlanKey
  name: string
  prices: { monthly: PlanPrice | null; annual: PlanPrice | null }
  /** Phrases without a quota (prd-4h-landing-v3 RF-B1) */
  highlights?: string[]
  /** The trial may come on the plan instead of the catalog root (read by catalogTrial) */
  trial?: CatalogTrial | null
  /** null = unlimited, 0 = not included in the plan */
  limits: Record<string, number | null>
  extras: {
    pdf_pages_per_note: number
    rag_max_pages: number
    upload_max_mb: number
    pdf_pages_monthly_cap: number
    quiz_max_questions: number
    quiz_short_answer: boolean
    /** none: the plan has no podcast (Free since the planos de lançamento) */
    podcast_format: 'teaser' | 'full' | 'none'
    podcast_max_minutes: number
  }
}

export interface CatalogFeature {
  label: string
  unit: string
  pro_benefit: string
}

/** Intensivo trial without a card (planos de lançamento, 2026-11): null when the API does not offer it */
export interface CatalogTrial {
  days: number
  card_required: boolean
  starts_on?: string
  excludes?: string[]
  pdf_pages_cap?: number
  /** Quotas for the whole trial, same shape as plans[].limits (null = no cap, 0 = not in the trial) */
  limits?: Record<string, number | null>
}

/** The Free's preview of the AI, once per account and with no deadline (prd-uso-justo §9): null without it */
export interface CatalogPreview {
  lifetime: boolean
  requires_verified_email: boolean
  limits: Record<string, number | null>
  pdf_pages: number
  quiz_max_questions: number
  quiz_short_answer: boolean
  podcast_seconds: number
  /** "Prévia grátis da IA, uma vez por conta: 1 PDF de até 50 páginas, …" (the API's sentence) */
  text: string
}

export interface PlanCatalog {
  currency: string
  period: string
  period_timezone: string
  plans: CatalogPlan[]
  features: Record<string, CatalogFeature>
  trial?: CatalogTrial | null
  /** false = "Assinatura em breve": POST /checkout/* answer 503 checkout_unavailable (absent on an older API) */
  checkout?: { available: boolean }
  preview?: CatalogPreview | null
}

/** Detail of the `feature-limit-reached` event (402 payload, PRD §4.1). */
export interface FeatureLimitDetail {
  feature: string
  used?: number | null
  limit?: number | null
  planRequired?: PlanKey | null
  resetsAt?: string | null
  /** The Free's preview is spent: it never resets (prd-uso-justo §9) */
  lifetime?: boolean
}

/** `auto_generation` of POST /documents (PRD §4.3) */
export interface DocumentAutoGeneration {
  dispatched: boolean
  blocked_reason: 'feature_limit' | 'pages_cap' | 'in_progress' | null
}

/** Laravel paginated resource collection */
export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

/** GET /ai/jobs/{id} — async AI generation (RF-30) */
export interface AiJob<T = unknown> {
  id: string
  type: 'cards' | 'mindmap' | 'mindmap_note'
  status: 'pending' | 'processing' | 'done' | 'failed'
  result?: T
  error?: string
  created_at: string
}

declare module '#app' {
  interface PageMeta {
    /** 'focus' hides BottomNav, FABs and the compact miniplayer (RF-F1.6). */
    chrome?: 'focus'
  }
}

/** Accuracy in questions of a scope (prd-4b-caderno-v3 RF-B3): `accuracy` only with ≥ 10 answered, else null. */
export interface ScopeQuestions {
  answered: number
  correct?: number
  accuracy: number | null
}

/** A matéria or assunto of the hub (up to 2 levels below the scope), GET /topics/{id}/summary `subjects`. */
export interface ScopeSubject {
  id: string
  name: string
  color: string | null
  /** From the root (1 = matéria, 2 = assunto) */
  depth: number
  parent_id: string | null
  cards: number
  /** "Em dia" ÷ cards, 0–100; null without cards */
  mastery: number | null
  questions: ScopeQuestions | null
  session_count: number
  /** At most one item: the lowest accuracy (< 60%) or, without questions, the lowest mastery (< 40%) */
  weak: boolean
}

export type NextStepKind = 'generate_cards' | 'review_errors' | 'quiz' | 'continue'

export interface ScopeNextStep {
  kind: NextStepKind
  title: string
  detail: string | null
  target: { type: 'note' | 'topic'; id: string; topic_id: string }
}

/** GET /topics/{id}/summary (prd-4b-caderno-v3 RF-B1): everything the hub shows above the materials, aggregated. */
export interface ScopeSummary {
  topic: { id: string; name: string; color: string | null; depth: number; learning_mode: string | null; parent_id: string | null; is_sample?: boolean }
  /** Ancestors, from the root to the parent */
  path: { id: string; name: string }[]
  counts: { cards: number; materials: number; subjects: number }
  mastery: { percent: number | null; in_day: number; cards: number }
  questions: ScopeQuestions | null
  /** `count` = the "Revisar hoje · N" (the same as the list, Hoje and the session) */
  session: { count: number; overdue: number; errors: number }
  can_quiz?: StudyGate
  can_podcast?: StudyGate
  exam: { id: string; title: string; days_remaining: number; cards_per_day: number | null; reta_final_active: boolean; projection?: ExamProjection | null } | null
  next_step: ScopeNextStep | null
  listen: { id: string; title: string; duration_seconds: number | null } | null
  subjects: ScopeSubject[]
  special: { quiz_errors: { cards: number; session_count: number }; questions?: { cards: number; session_count: number }; loose: { cards: number; session_count: number } }
}

export type MaterialStatus = 'ready' | 'processing' | 'generating' | 'failed' | 'blocked'

/** A line of GET /topics/{id}/materials (RF-B2): a PDF with its parts, or a manual note. */
export interface MaterialRow {
  kind: 'pdf' | 'note'
  /** Document id (pdf) or note id (note) */
  id: string
  /** The note that opens (the 1st part of a PDF); null while a PDF has no note yet */
  note_id: string | null
  title: string
  topic: { id: string; name: string }
  pages: number | null
  parts: number | null
  words: number | null
  cards: number
  mastery: number | null
  session_count: number
  ahead_count: number
  status: MaterialStatus
  progress: { done: number; total: number } | null
  /** The automatic cards of a PDF (prd-4c-material-v3 RF-B9), per part, one generation for the document */
  auto_cards_status?: Document['auto_cards_status']
  /** Why the note of a PDF was not started */
  blocked_reason?: DocumentAutoGeneration['blocked_reason']
  updated_at: string
}

export interface MaterialsPage {
  data: MaterialRow[]
  meta: { next_cursor: string | null; total: number }
}

/** GET /topics/performance (RF-B3): a line per topic of the user, with the numbers of its subtree. */
export interface TopicPerformance {
  topic_id: string
  parent_id: string | null
  depth: number
  name: string
  cards: number
  mastery: number | null
  questions: ScopeQuestions
  session_count: number
}

/**
 * Where a card came from (prd-4c-material-v3 RF-B2, prd-4d-revisao-v3 RF-B1), the same object in the
 * library and in the review session. Precedence on the API: quiz question → part of a PDF → note.
 */
export type CardOrigin =
  | { kind: 'quiz'; quiz_id: string; title: string; question_number: number | null }
  | { kind: 'document'; note_id: string; title: string; document_id: string; document_name: string; part: { index: number; total: number } | null; page: number | null }
  | { kind: 'note'; note_id: string; title: string; topic_id: string | null }
  | { kind: 'question'; question_id: string; title: string; source: string | null }

/** A card of the library (GET /topics/{id}/flashcards, cursor mode). */
export interface LibraryCard extends Flashcard {
  topic_name?: string | null
  origin?: CardOrigin | null
}

export interface LibraryPage {
  data: LibraryCard[]
  /** `total` only on the 1st page (no cursor); null on the next ones */
  meta: { next_cursor: string | null; total: number | null }
}

/** A part of a PDF material (4c-1: a PDF is one part; 4c-2 brings pages). */
export interface MaterialPart {
  note_id: string
  index: number
  title: string
  page_start: number | null
  page_end: number | null
  cards: number
  mastery: number | null
  session_count: number
  status: MaterialStatus
}

/** GET /notes/{id}/material (prd-4c-material-v3 RF-B1): everything the material route shows but the content. */
export interface NoteMaterial {
  note: { id: string; title: string; topic_id: string; word_count: number; kind: 'note' | 'part'; updated_at: string }
  path: { id: string; name: string }[]
  document: { id: string; name: string; pages: number | null; status: MaterialStatus } | null
  parts: MaterialPart[]
  cards: { total: number; session_count: number; ahead_count: number; errors_count: number }
  /** cards_ai left this month (null remaining: Pro, no limit); not reserved */
  can_generate: { ok: boolean; code?: string; remaining: number | null }
}
