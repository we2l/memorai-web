/**
 * Front-end analytics taxonomy v1 (docs/produto/eventos-analytics.md, prd-analytics-posthog §4.3).
 * Every `track()` call is type-checked against FrontEventProps: add the event here first.
 */

export type ReviewMode = 'normal' | 'blitz' | 'survival' | 'errors_only' | 'backlog'
export type ReviewScope = 'topic' | 'deck' | 'none'
/** Slice of the session (prd-caderno-f2-recorte RF-F7); null = global or deck session */
export type ReviewScopeType = 'topic' | 'document' | 'note' | 'quiz' | 'podcast' | 'cards'
/** `annual` = annual chosen before Stripe decides between Pix and card. */
export type AnalyticsBilling = 'monthly' | 'annual' | 'annual_pix' | 'annual_card'
export type OnboardingPath = 'sample' | 'pdf' | 'text' | 'anki' | 'skip'
export type UploadSource = 'onboarding' | 'caderno' | 'other'
export type ReminderSource = 'settings' | 'session_end' | 'onboarding'
/** Navegação v3 (prd-navegacao-v3 RF-12) */
export type NavItem = 'hoje' | 'cadernos' | 'praticar' | 'progresso'
export type NavSurface = 'top' | 'bottom'
export type AddOpenOrigin = 'topnav' | 'header' | 'shortcut' | 'search' | 'checklist' | 'scope' | 'review'
export type SearchOpenOrigin = 'shortcut' | 'topnav' | 'header'
export type PracticeMode = 'review' | 'quiz' | 'listen'
/** Which entry of the mode card on /praticar */
export type PracticeEntry = 'main' | 'blitz' | 'errors_only' | 'backlog' | 'one_subject' | 'new_quiz' | 'history' | 'continue' | 'generate' | 'library'
export type MiniplayerAction = 'play' | 'pause' | 'expand' | 'close'
/** Hoje v3 (prd-4a-hoje-v3 RF-F8) */
export type HomePlanStepKey = 'review' | 'quiz' | 'listen' | 'material'
export type HomeChecklistItem = 'topic' | 'material' | 'cards' | 'review' | 'streak'

/** Landing (prd-landing-v4 RF-L13, prd-landing-d RF-D18): `?m=` of the video and where the click happened */
export type LandingMessageProp = 'padrao' | 'prova' | 'esqueci' | 'faculdade' | 'ingles'
export type LandingCtaPosition = 'header' | 'hero' | 'curve' | 'story_material' | 'story_review' | 'quiz' | 'projection'
  | 'podcast' | 'areas' | 'plans_free' | 'plans_pro' | 'final' | 'sticky'
/** The tab of the areas whose call was clicked (position `areas`) */
export type LandingAreaProp = 'concurso' | 'faculdade' | 'oab' | 'enem' | 'idiomas'

export interface FrontEventProps {
  /** Landing (prd-landing-v4 RF-L13, prd-landing-d RF-D18) */
  landing_viewed: { message: LandingMessageProp, utm_source: string | null, utm_medium: string | null, utm_campaign: string | null, utm_content: string | null }
  landing_cta_clicked: { position: LandingCtaPosition, message: LandingMessageProp, area?: LandingAreaProp }
  /** First play of the real podcast sample (prd-landing-d RF-D18) */
  landing_sample_played: { message: LandingMessageProp }
  /** Conta e onboarding v3 (prd-4g-conta-onboarding-v3 RF-F16) */
  onboarding_step: { step: 1 | 2 | 3, mode: string | null }
  onboarding_path: { path: OnboardingPath }
  onboarding_sample_created: { mode: string }
  settings_goal: { batches: number }
  settings_section_open: { section: string }
  error_page: { status: number }
  auth_password_toggle: { visible: boolean }
  onboarding_completed: { path: OnboardingPath, learning_mode: string | null }
  pdf_upload_started: { size_mb: number, source: UploadSource }
  review_session_started: { mode: ReviewMode, scoped: ReviewScope, cards_available: number, scope_type: ReviewScopeType | null, origin: 'quiz' | 'question' | 'loose' | null, ahead: boolean, errors_only: boolean }
  review_session_completed: { cards: number, duration_s: number, mode: ReviewMode, again_rate: number }
  // podcast_demo: the podcast paywall with the demo video (GenerateSheet, Ouvir of /praticar; prd-planos-lancamento RF-F3)
  paywall_viewed: { feature: string | null, source: 'limit_402' | 'planos_page' | 'podcast_demo', plan_required: 'pro' | null }
  upgrade_clicked: { feature: string | null, billing: AnalyticsBilling | null, source: 'upgrade_modal' | 'planos_page' | 'podcast_demo' }
  plans_toggle: { period: 'monthly' | 'annual' }
  plans_checkout_click: { period: 'monthly' | 'annual' }
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
  scope_open: { depth: number, mode: string | null }
  next_step_click: { kind: 'generate_cards' | 'review_errors' | 'quiz' | 'continue' }
  subject_open: { depth: number }
  material_search: Record<string, never>
  material_load_more: { rows: number }
  /** Material e biblioteca v3 (prd-4c-material-v3 RF-F13) */
  material_open: { kind: 'note' | 'part', parts: number }
  material_mode: { mode: 'read' | 'edit' }
  outline_click: { level: number }
  selection_action: { action: 'card' | 'ai3' | 'ask' }
  pdf_page_open: { page: number | null }
  panel_review: { count: number }
  /** Material em partes (prd-4c-material-v3 4c-2) */
  part_nav: { direction: 'previous' | 'next', via: 'link' | 'key' }
  library_filter: { filter: 'q' | 'state' | 'origin' | 'errors' | 'tag' | 'sort' | 'clear' }
  /** "Colar questão errada" (prd-questao-errada) */
  question_paste_opened: { origin: 'add' | 'library' | 'shortcut' }
  question_pasted: { count: number, edited: boolean, with_reason: boolean }
  library_bulk: { action: 'review' | 'delete', count: number }
  /** Organização do caderno (prd-4b-caderno-v3 RF-F18) */
  item_move: { kind: 'topic' | 'note' | 'pdf' | 'cards' }
  item_trash: { kind: 'topic' | 'note' | 'pdf' }
  trash_restore: { via: 'undo' | 'page' }
  anki_destination: { type: 'new' | 'existing' }
  /** Revisão v3 (prd-4d-revisao-v3 RF-F12) */
  review_batch_end: { batch_index: number, batches_total: number, remembered: number, size: number, scope_type: ReviewScopeType | null }
  review_batch_continue: { batch_index: number }
  review_batch_stop: { batch_index: number }
  review_origin_open: { kind: 'quiz' | 'document' | 'note' | 'question' }
  review_explain_open: Record<string, never>
  retention_suggestion: { action: 'apply' | 'dismiss' }
  review_goal_met: { target_batches: number }
  /** Praticar v3 (prd-4e-praticar-v3 §3.7) */
  quiz_config: { kind: 'battery' | 'exam', count: number, scope_type: 'topic' | 'document' | 'note' }
  quiz_shortfall: { requested: number, delivered: number }
  quiz_error_cards: { selected: number, total: number }
  quiz_retry_errors: { errors: number }
  quiz_review_errors_now: { cards: number }
  podcast_transcript_open: Record<string, never>
  podcast_transcript_seek: Record<string, never>
  podcast_completed: { origin: 'manual' | 'daily' }
  daily_episode_toggle: { on: boolean }
  /** Progresso e Provas v3 (prd-4f-progresso-v3 RF-F13) */
  progress_scope: { scope: 'all' | 'notebook' }
  performance_action: { action: 'train' | 'review' | 'open' }
  heatmap_day_open: Record<string, never>
  exam_create: { origin: 'progress' | 'scope' | 'hoje' }
  exam_export: { kind: 'ics' | 'google' }
  projection_explain_open: Record<string, never>
}

export type FrontEvent = keyof FrontEventProps

/** Super-properties (posthog `register`): sent with every later event of the person, sign-up and onboarding included */
export interface FrontSuperProps {
  landing_message: LandingMessageProp
}

/** Feature flags read on the client. None in use this cycle. */
// 'reverse_trial' — Fase 2 (evaluate on the backend: must not depend on consent)
export type FeatureFlagKey = never
