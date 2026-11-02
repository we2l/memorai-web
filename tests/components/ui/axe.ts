import axe from 'axe-core'

/**
 * Basic a11y of a mounted component (RF-2.2): names, roles, ARIA and labels by axe-core in the test DOM.
 * Contrast needs a real layout and is covered by tests/scripts/tokensContrast.test.ts and the E2E axe;
 * `region` is about whole pages.
 */
export async function axeViolations(el: Element): Promise<string[]> {
  const result = await axe.run(el, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations'],
  })
  return result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
}
