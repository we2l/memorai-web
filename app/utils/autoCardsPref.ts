const KEY = 'baigi-auto-cards'

/** "Criar cards automaticamente" preference (default on — RF-F5.1). */
export function readAutoCardsPref(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    // intencional: sem localStorage (modo privado) vale o padrão
    return true
  }
}

export function writeAutoCardsPref(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // intencional: sem localStorage a preferência só não persiste
  }
}
