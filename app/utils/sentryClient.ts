// The only door to @sentry/browser (plugins/sentry.client.ts imports this file dynamically): named imports keep
// replay, feedback and tracing out of the chunk, which the `analytics-*` name keeps out of the precache.
export { captureException, dedupeIntegration, globalHandlersIntegration, httpContextIntegration, init, linkedErrorsIntegration, breadcrumbsIntegration, functionToStringIntegration, eventFiltersIntegration, browserApiErrorsIntegration } from '@sentry/browser'
