import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { h } from 'vue'
import Input from '~/components/ui/Input.vue'
import Textarea from '~/components/ui/Textarea.vue'
import Select from '~/components/ui/Select.vue'
import Checkbox from '~/components/ui/Checkbox.vue'
import Switch from '~/components/ui/Switch.vue'
import RadioGroup from '~/components/ui/RadioGroup.vue'
import { axeViolations } from './axe'

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

describe('UiInput', () => {
  it('rótulo ligado ao campo por id automático; borda line-input; v-model', async () => {
    const w = await mountSuspended(Input, { props: { modelValue: 'a', label: 'Nome' }, attachTo: document.body })
    const input = w.get('input')
    const label = w.get('label')
    expect(input.attributes('id')).toBeTruthy()
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect([...input.element.parentElement!.classList]).toEqual(expect.arrayContaining(['border-line-input', 'min-h-touch', 'focus-within:outline-focus']))
    await input.setValue('abc')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['abc'])
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('dica e erro em aria-describedby; erro anunciado e aria-invalid', async () => {
    const w = await mountSuspended(Input, { props: { label: 'E-mail', hint: 'Usamos para entrar.', error: 'Informe um e-mail válido.' }, attachTo: document.body })
    const input = w.get('input')
    const ids = input.attributes('aria-describedby')!.split(' ')
    expect(ids).toHaveLength(2)
    expect(ids.map(id => document.getElementById(id)?.textContent)).toEqual(['Usamos para entrar.', 'Informe um e-mail válido.'])
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(w.get('[role="alert"]').text()).toBe('Informe um e-mail válido.')
    expect([...input.element.parentElement!.classList]).toContain('border-danger')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('atributos vão para o <input>, class para a raiz; id explícito; prefix/suffix; rótulo oculto', async () => {
    const w = await mountSuspended(Input, {
      props: { label: 'Buscar', id: 'busca', hideLabel: true, type: 'search' },
      attrs: { class: 'col-span-2', name: 'q', autocomplete: 'off', 'data-testid': 'busca' },
      slots: { prefix: () => h('span', { class: 'lupa' }), suffix: () => 'Ctrl K' },
    })
    expect(w.classes()).toContain('col-span-2')
    const input = w.get('input')
    expect(input.attributes()).toMatchObject({ id: 'busca', name: 'q', autocomplete: 'off', 'data-testid': 'busca', type: 'search' })
    expect(input.classes()).not.toContain('col-span-2')
    expect(w.get('label').classes()).toContain('sr-only')
    expect(w.find('.lupa').exists()).toBe(true)
    expect(w.text()).toContain('Ctrl K')
  })

  it('opcional e desabilitado', async () => {
    const w = await mountSuspended(Input, { props: { label: 'Apelido', optional: true, disabled: true } })
    expect(w.get('label').text()).toContain('(opcional)')
    expect(w.get('input').attributes('disabled')).toBeDefined()
  })
})

describe('UiTextarea', () => {
  it('mesmo contrato do UiInput', async () => {
    const w = await mountSuspended(Textarea, { props: { label: 'Anotação', error: 'Obrigatório', rows: 3 }, attachTo: document.body })
    const ta = w.get('textarea')
    expect(w.get('label').attributes('for')).toBe(ta.attributes('id'))
    expect(ta.attributes('rows')).toBe('3')
    expect(ta.attributes('aria-invalid')).toBe('true')
    await ta.setValue('texto')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['texto'])
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('UiSelect', () => {
  const options = [{ value: '7', label: '7h' }, { value: '19', label: '19h' }]

  it('<select> nativo rotulado, com placeholder e change', async () => {
    const w = await mountSuspended(Select, { props: { modelValue: '', options, label: 'Horário', placeholder: 'Escolha' }, attachTo: document.body })
    const select = w.get('select')
    expect(w.get('label').attributes('for')).toBe(select.attributes('id'))
    const opts = select.findAll('option')
    expect(opts.map(o => o.text())).toEqual(['Escolha', '7h', '19h'])
    expect(opts[0]!.attributes('disabled')).toBeDefined()
    expect(select.classes()).toContain('text-fg-muted')
    await select.setValue('19')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['19'])
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('compatível com o uso antigo: id para <label for> de fora e @click na raiz mesmo desabilitado', async () => {
    const onClick = vi.fn()
    const w = await mountSuspended(Select, { props: { modelValue: '7', options, id: 'reminder-hour', disabled: true }, attrs: { onClick } })
    expect(w.find('label').exists()).toBe(false)
    const select = w.get('select')
    expect(select.attributes('id')).toBe('reminder-hour')
    expect(select.attributes('disabled')).toBeDefined()
    expect((select.element as HTMLSelectElement).value).toBe('7')
    await w.trigger('click')
    expect(onClick).toHaveBeenCalled()
  })

  it('erro e sem placeholder duplicado quando já há opção vazia', async () => {
    const w = await mountSuspended(Select, { props: { modelValue: '', options: [{ value: '', label: 'Sem limite' }, ...options], placeholder: 'Sem limite', label: 'Tempo', error: 'Escolha um' } })
    expect(w.findAll('option')).toHaveLength(3)
    expect(w.get('select').attributes('aria-invalid')).toBe('true')
  })
})

describe('UiCheckbox', () => {
  it('nativo, rotulado, com descrição e v-model', async () => {
    const w = await mountSuspended(Checkbox, { props: { modelValue: false, label: 'Só o que errei', description: 'Inclui as questões.' }, attachTo: document.body })
    const input = w.get('input[type="checkbox"]')
    expect(w.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(document.getElementById(input.attributes('aria-describedby')!)?.textContent).toBe('Inclui as questões.')
    expect(w.classes()).toContain('min-h-touch')
    await input.setValue(true)
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([true])
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('desabilitado', async () => {
    const w = await mountSuspended(Checkbox, { props: { modelValue: true, label: 'X', disabled: true } })
    expect(w.get('input').attributes('disabled')).toBeDefined()
    expect((w.get('input').element as HTMLInputElement).checked).toBe(true)
  })
})

describe('UiSwitch', () => {
  it('role="switch" com aria-checked controlado e nome pelo rótulo', async () => {
    const w = await mountSuspended(Switch, {
      props: { modelValue: true, label: 'E-mails de estudo', description: 'Um por dia.' },
      attrs: { 'data-testid': 'reminder-switch' },
      attachTo: document.body,
    })
    const sw = w.get('[role="switch"]')
    expect(sw.attributes('aria-checked')).toBe('true')
    expect(sw.attributes('data-testid')).toBe('reminder-switch')
    expect(document.getElementById(sw.attributes('aria-labelledby')!)?.textContent?.trim()).toBe('E-mails de estudo')
    expect(document.getElementById(sw.attributes('aria-describedby')!)?.textContent).toBe('Um por dia.')
    await sw.trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([false])
    // Controlled: shows what the parent holds until it changes
    expect(sw.attributes('aria-checked')).toBe('true')
    await w.setProps({ modelValue: false })
    expect(sw.attributes('aria-checked')).toBe('false')
    expect(sw.classes()).toContain('bg-line-input')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('desabilitado não alterna', async () => {
    const w = await mountSuspended(Switch, { props: { modelValue: false, label: 'Sons', disabled: true } })
    expect(w.get('[role="switch"]').attributes('disabled')).toBeDefined()
  })
})

describe('UiRadioGroup', () => {
  const options = [
    { value: 'a', label: 'Normal', description: 'Lotes de 20' },
    { value: 'b', label: 'Relâmpago' },
    { value: 'c', label: 'Só erros', disabled: true },
  ]

  it('fieldset com legenda, rádios nativos com nome comum, rótulo e descrição', async () => {
    const w = await mountSuspended(RadioGroup, { props: { modelValue: 'a', options, label: 'Modo' }, attachTo: document.body })
    expect(w.element.tagName).toBe('FIELDSET')
    expect(w.get('legend').text()).toBe('Modo')
    const radios = w.findAll('input[type="radio"]')
    expect(new Set(radios.map(r => r.attributes('name'))).size).toBe(1)
    expect(radios.map(r => (r.element as HTMLInputElement).checked)).toEqual([true, false, false])
    expect(document.getElementById(radios[0]!.attributes('aria-labelledby')!)?.textContent).toBe('Normal')
    expect(document.getElementById(radios[0]!.attributes('aria-describedby')!)?.textContent).toBe('Lotes de 20')
    expect(radios[2]!.attributes('disabled')).toBeDefined()
    await radios[1]!.setValue(true)
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['b'])
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('cartões em colunas, selecionado em tom de ação', async () => {
    const w = await mountSuspended(RadioGroup, { props: { modelValue: 'b', options, label: 'Modo', variant: 'cards', columns: 3 } })
    expect(w.get('div').classes()).toEqual(expect.arrayContaining(['grid', 'sm:grid-cols-3']))
    expect(w.get('label').classes()).toEqual(expect.arrayContaining(['has-checked:ring-action', 'has-checked:bg-action-subtle']))
  })
})

describe('UiFieldGrid (controles alinhados)', () => {
  it('a partir de sm cada campo vira subgrade de 3 linhas: rótulo, controle e dica + erro num bloco só', async () => {
    const FieldGrid = (await import('~/components/ui/FieldGrid.vue')).default
    const w = await mountSuspended(FieldGrid, {
      props: { cols: 3 },
      slots: { default: () => [h(Input, { label: 'Data da prova', type: 'date' }), h(Input, { label: 'Quantos cards?', hint: 'De 10 a 20.000', error: 'Use um número' })] },
      attachTo: document.body,
    })
    expect(w.classes()).toEqual(expect.arrayContaining(['grid', 'sm:grid-cols-3', 'sm:*:row-span-3', 'sm:*:grid-rows-subgrid']))
    const fields = w.element.children
    expect(fields).toHaveLength(2)
    // Field without hint: label + control; with hint and error: label + control + one block with both
    expect(fields[0]!.children).toHaveLength(2)
    expect(fields[1]!.children).toHaveLength(3)
    expect(fields[1]!.children[2]!.querySelector('[role=alert]')!.textContent).toBe('Use um número')
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('UiSelect: opção vazia de verdade', () => {
  it('"Todos os cadernos" (valor vazio) aparece como escolha, não como placeholder', async () => {
    const w = await mountSuspended(Select, { props: { modelValue: '', options: [{ value: '', label: 'Todos os cadernos' }, { value: 'a', label: 'TRF' }], label: 'Escopo' } })
    expect(w.get('select').classes()).toContain('text-fg-strong')
  })
})
