/**
 * Front-end analytics taxonomy v1 (docs/produto/eventos-analytics.md, prd-analytics-posthog §4.3).
 * Every `track()` call is type-checked against FrontEventProps: add the event here first.
 */

export type ReviewMode = 'normal' | 'blitz' | 'survival' | 'errors_only' | 'backlog'
export type ReviewScope = 'topic' | 'deck' | 'none'
/** `annual` = annual chosen before Stripe decides between Pix and card. */
export type AnalyticsBilling = 'monthly' | 'annual' | 'annual_pix' | 'annual_card'
export type OnboardingStepName = 'learning_mode' | 'choose_path' | 'processing' | 'cards_ready' | 'pdf_sent'
export type OnboardingPath = 'review' | 'home' | 'notebook' | 'import_anki' | 'skip'
export type UploadSource = 'onboarding' | 'caderno' | 'other'
export type ReminderSource = 'settings' | 'session_end' | 'onboarding'
/** Navegação v3 (prd-navegacao-v3 RF-12) */
export type NavItem = 'hoje' | 'cadernos' | 'praticar' | 'progresso'
export type NavSurface = 'top' | 'bottom'
export type AddOpenOrigin = 'topnav' | 'header' | 'shortcut' | 'search' | 'checklist'
export type SearchOpenOrigin = 'shortcut' | 'topnav' | 'header'
export type PracticeMode = 'review' | 'quiz' | 'listen'
/** Which entry of the mode card on /praticar */
export type PracticeEntry = 'main' | 'blitz' | 'errors_only' | 'backlog' | 'one_subject' | 'new_quiz' | 'history' | 'continue' | 'generate' | 'library'
export type MiniplayerAction = 'play' | 'pause' | 'expand' | 'close'
/** Hoje v3 (prd-4a-hoje-v3 RF-F8) */
export type HomePlanStepKey = 'review' | 'quiz' | 'listen' | 'material'
export type HomeChecklistItem = 'topic' | 'material' | 'cards' | 'review' | 'streak'

export interface FrontEventProps {
  onboarding_step_viewed: { step: 0 | 1 | 2 | 3 | 4, step_name: OnboardingStepName }
  onboarding_completed: { path: OnboardingPath, learning_mode: string | null }
  pdf_upload_started: { size_mb: number, source: UploadSource }
  review_session_started: { mode: ReviewMode, scoped: ReviewScope, cards_available: number }
  review_session_completed: { cards: number, duration_s: number, mode: ReviewMode, again_rate: number }
  paywall_viewed: { feature: string | null, source: 'limit_402' | 'planos_page', plan_required: 'pro' | null }
  upgrade_clicked: { feature: string | null, billing: AnalyticsBilling | null, source: 'upgrade_modal' | 'planos_page' }
  reminder_toggled: { on: boolean, hour: number, source: ReminderSource }
  nav_clicked: { item: NavItem, surface: NavSurface }
  add_opened: { origin: AddOpenOrigin }
  search_opened: { origin: SearchOpenOrigin }
  practice_mode_started: { mode: PracticeMode, entry: PracticeEntry, scope: 'topic' | 'all' }
  miniplayer_toggled: { action: MiniplayerAction }
  home_plan_step_click: { step: HomePlanStepKey, position: number }
  home_goal_met: { target_batches: number }
  home_checklist_click: { item: HomeChecklistItem }
  home_exam_click: Record<string, never>
}

export type FrontEvent = keyof FrontEventProps

/** Feature flags read on the client. None in use this cycle. */
// 'reverse_trial' — Fase 2 (evaluate on the backend: must not depend on consent)
export type FeatureFlagKey = never
