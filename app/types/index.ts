export interface User {
  id: string
  name: string
  email: string
  plan: string
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
