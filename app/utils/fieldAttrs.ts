/**
 * Fallthrough attributes of a form component (UiInput, UiTextarea, UiSelect): class and style go to the
 * root (the field with label), the rest to the control. `listeners: 'root'` keeps the on* handlers on the
 * root too (UiSelect: a click on a disabled native <select> is only seen by its parent).
 */
export function splitFieldAttrs(attrs: Record<string, unknown>, opts: { listeners?: 'root' | 'control' } = {}) {
  const root: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    const toRoot = key === 'class' || key === 'style' || (opts.listeners === 'root' && /^on[A-Z]/.test(key))
    ;(toRoot ? root : rest)[key] = value
  }
  return { root, rest }
}
