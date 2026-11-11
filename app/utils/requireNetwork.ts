import { useOfflineStore } from '~/stores/offline'

/**
 * IA, chat and hints need the network (prd-revisao-offline RF-F7, D8): returns false and says so when the app knows it
 * is offline, so the caller does not open a sheet that can only fail.
 */
export function requireNetwork(): boolean {
  const offline = useOfflineStore()
  if (!offline.offline) return true
  useToast().show(offline.serverDown
    ? 'Isso precisa do servidor, que não respondeu agora. Sua revisão continua.'
    : 'Isso precisa de internet. Sua revisão continua.', 'info')
  return false
}
