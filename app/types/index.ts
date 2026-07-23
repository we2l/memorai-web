export interface User {
  id: string
  name: string
  email: string
  plan: string
  subscription_status?: string | null
  onboarding_completed: boolean
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
  ratings_today: {
    again: number
    hard: number
    good: number
    easy: number
  }
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
  notes_count: number
  flashcards_count: number
  children: Topic[]
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  topic_id: string
  title: string
  content: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface GraphNode {
  id: string
  name: string
  parent_id: string | null
  notes_count: number
  flashcards_count: number
  review_count: number
  progress: number
}

export interface GraphEdge {
  id?: string
  source: string
  target: string
  type: 'hierarchy' | 'connection'
  label?: string | null
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface TopicConnection {
  id: string
  source_topic_id: string
  target_topic_id: string
  label: string | null
}

export interface TopicDetails {
  id: string
  name: string
  progress: number
  flashcards_count: number
  notes_count: number
  review_count: number
  flashcards: { id: string; front: string; state: string; due: string | null }[]
  notes: { id: string; title: string }[]
  goal: { target_date: string; cards_per_day: number; remaining: number; days_left: number } | null
}

export interface TopicProgress {
  id: string
  name: string
  flashcards_count: number
  review_count: number
  progress: number
}

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
}

export interface AnkiImportStatus {
  status: 'pending' | 'previewing' | 'confirmed' | 'processing' | 'completed' | 'failed'
  current_step?: string
  total_cards?: number
  imported_cards?: number
  progress_percent?: number
  stats?: { decks_created: number; cards_created: number; topics_created: number; media_extracted: number }
  error?: string
}

export interface FeatureData {
  used: number
  limit: number | null
  remaining: number | null
}

export interface FeatureUsageData {
  plan: string
  period_start: string
  period_end: string
  features: Record<string, FeatureData>
}

// Documents (PDF)
export interface Document {
  id: string
  original_name: string
  file_size: number
  pages_count: number | null
  status: 'uploaded' | 'pending' | 'processing' | 'completed' | 'failed'
  topic_id: string | null
  chunks_count?: number
  total_chunks?: number | null
  has_generated_note?: boolean
  note_generation_status?: 'generating' | 'completed' | 'failed' | null
  topic_tree_generated?: boolean
  study_structure_status?: 'generating' | 'completed' | 'failed' | null
  note_stats?: {
    note_id: string
    sections: number
    gotchas: number
    insights: number
    errors: number
  } | null
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
  duration_target?: PodcastDuration | null
  tone?: PodcastTone | null
  format?: PodcastFormat | null
  topic_id?: string | null
  topic_name?: string | null
  source_data?: { topic_names?: string[]; card_count?: number; error_count?: number } | null
  card_ids?: string[] | null
  timestamps?: { type: string; start_ms: number; end_ms: number; flip_ms?: number; card_index?: number }[] | null
  session_id?: string | null
  episode_number?: number | null
  created_at: string
}

export type PodcastContentMode = 'weak_points' | 'general_review' | 'pre_exam'
export type PodcastDuration = 'short' | 'medium' | 'long'
export type PodcastTone = 'formal' | 'conversational' | 'motivational' | 'didactic'
export type PodcastFormat = 'expository' | 'debate'

export interface PodcastSpeakerConfig {
  host1: { name: string; voice: string }
  host2?: { name: string; voice: string }
}

export interface SubscriptionInfo {
  plan: string
  subscription_status: string | null
  subscription_ends_at: string | null
  has_subscription: boolean
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
  topic?: { id: string; name: string } | null
  questions?: QuizQuestion[]
  started_at: string | null
  completed_at: string | null
  cards_created_at: string | null
  created_at: string
}

export interface QuizConfig {
  quantity: number
  types: ('multiple_choice' | 'true_false' | 'short_answer')[]
  difficulty: 'easy' | 'mixed' | 'hard'
  time_limit: number | null
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
  days_remaining: number
  urgency_color: 'red' | 'yellow' | 'green'
  reta_final_enabled: boolean
  reta_final_active: boolean
  google_calendar_event_id: string | null
  topics: { id: string; name: string }[]
  created_at: string
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
