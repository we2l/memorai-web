// utils/offlineDb on demand, one module promise for the whole app (prd-revisao-offline): the stores in the entry and the
// review store (shared with the visitor of /comecar/{area}) only pay for IndexedDB when an account uses it.
let loading: Promise<typeof import('~/utils/offlineDb')> | null = null

export function loadOfflineDb() {
  loading ??= import('~/utils/offlineDb')
  return loading
}
