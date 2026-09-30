/** Friendly Portuguese message per HTTP status (never show raw server errors). */
export function getClientFriendlyMessage(status?: number | null): string {
  switch (status) {
    case 400: return 'Requisição inválida. Verifique os dados e tente novamente.'
    case 403: return 'Você não tem permissão para esta ação.'
    case 404: return 'Recurso não encontrado.'
    case 405: return 'Ação não permitida. Tente novamente.'
    case 408: return 'Tempo esgotado. Tente novamente.'
    case 409: return 'Essa ação conflita com o estado atual. Recarregue e tente de novo.'
    case 413: return 'Arquivo muito grande.'
    case 419: return 'Sessão expirada. Recarregue a página.'
    case 422: return 'Dados inválidos. Verifique os campos.'
    case 429: return 'Muitas tentativas. Aguarde um momento.'
    case 500: return 'Algo deu errado. Tente novamente em instantes.'
    case 502: return 'Servidor temporariamente indisponível.'
    case 503: return 'Sistema em manutenção. Tente novamente em breve.'
    case 0:
    case null:
    case undefined: return 'Sem conexão. Verifique sua internet e tente de novo.'
    default: return 'Erro inesperado. Tente novamente.'
  }
}

const TECHNICAL = /method is not supported|Route \[|Target class|No query results|SQLSTATE|Undefined|Call to|Exception|Stack trace|Server Error/i

/** True when a server message is technical jargon that must not reach the user. */
export function isTechnicalMessage(msg: string): boolean {
  return TECHNICAL.test(msg)
}

/** HTTP status of an ofetch/$api error (undefined for network failures). */
export function getErrorStatus(e: unknown): number | undefined {
  const err = e as { response?: { status?: number }; statusCode?: number; status?: number } | null
  return err?.response?.status ?? err?.statusCode ?? err?.status
}

/**
 * Best user-facing message for an API error.
 * Priority: first validation error → sanitized `message` → default by status.
 */
export function extractApiMessage(e: unknown, fallback?: string): string {
  const err = e as { data?: any; response?: { _data?: any } } | null
  const data = err?.data ?? err?.response?._data
  const status = getErrorStatus(e)

  if (data && typeof data === 'object') {
    const errors = data.errors
    if (errors && typeof errors === 'object') {
      for (const value of Object.values(errors)) {
        const first = Array.isArray(value) ? value[0] : value
        if (typeof first === 'string' && first && !isTechnicalMessage(first)) return first
      }
    }
    if (typeof data.message === 'string' && data.message && !isTechnicalMessage(data.message)) {
      return data.message
    }
  }

  return fallback ?? getClientFriendlyMessage(status)
}
