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
  type: string
  front: string
  back: string
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
