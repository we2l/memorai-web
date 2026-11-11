/**
 * Build-time Markdown of the blog (prd-blog-seo RF-B1..B4): content/blog/*.md -> metadata + HTML segments.
 * Runs only in Node (Nuxt module and Vite plugin); the browser gets the finished HTML, never `marked`.
 *
 * Front matter: a flat `key: value` block between `---` lines (strings, dates as strings, `tags: a, b`).
 * Embeds are fenced blocks with a JSON body, rendered by components on the page:
 *   ```quiz  {"area": "concurso", "cards": [{"q": "...", "a": "...", "source": "..."}]}
 *   ```cta   {"area": "concurso", "text": "..."}
 *   ```tool  {"tool": "calculadora-do-esquecimento"}
 *   ```card  {"q": "...", "a": "..."}   (an example card inside the text)
 *   ```shot  {"shot": "revisao", "caption": "..."}  (a real screen of the app, BLOG_SHOTS)
 * FAQ: the `### questions` under a `## Perguntas frequentes` heading become FAQPage data.
 */
import { Marked, type Token, type Tokens } from 'marked'
import { BLOG_AREAS, BLOG_CATEGORIES, BLOG_FACT_ICONS, BLOG_SHOTS, BLOG_TOOLS, type BlogCover, type BlogFact, type BlogFactIcon, type BlogShot, type BlogArea, type BlogArticle, type BlogCategory, type BlogMeta, type BlogSegment, type BlogTool, type QuizCard } from './types'

export * from './types'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function parseFrontMatter(source: string, file: string): { data: Record<string, string>, body: string } {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) throw new Error(`${file}: falta o front matter entre ---`)
  const data: Record<string, string> = {}
  for (const line of m[1]!.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/)
    if (!kv) throw new Error(`${file}: linha inválida no front matter: "${line}"`)
    data[kv[1]!] = kv[2]!.trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return { data, body: m[2]! }
}

function plainText(tokens: Token[] | undefined): string {
  if (!tokens) return ''
  return tokens.map((t) => {
    if ('tokens' in t && t.tokens) return plainText(t.tokens)
    return 'text' in t ? String(t.text) : ''
  }).join('')
}

function parseEmbed(lang: string, text: string, file: string): BlogSegment {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`${file}: bloco \`\`\`${lang} com JSON inválido`)
  }
  const area = (data.area ?? 'concurso') as BlogArea
  if ((lang === 'quiz' || lang === 'cta') && !BLOG_AREAS.includes(area)) throw new Error(`${file}: área desconhecida "${String(data.area)}"`)
  if (lang === 'quiz') {
    const cards = data.cards as QuizCard[] | undefined
    if (!Array.isArray(cards) || cards.length < 3 || cards.length > 6 || cards.some(c => !c?.q || !c?.a)) {
      throw new Error(`${file}: o quiz pede de 3 a 6 cards com q e a`)
    }
    return { kind: 'quiz', area, title: data.title as string | undefined, cards }
  }
  if (lang === 'cta') {
    if (!data.text) throw new Error(`${file}: bloco cta sem text`)
    return { kind: 'cta', area, text: String(data.text) }
  }
  if (lang === 'tool') {
    if (!BLOG_TOOLS.includes(data.tool as BlogTool)) throw new Error(`${file}: ferramenta desconhecida "${String(data.tool)}"`)
    return { kind: 'tool', tool: data.tool as BlogTool }
  }
  if (lang === 'shot') {
    if (!(String(data.shot) in BLOG_SHOTS)) throw new Error(`${file}: print desconhecido "${String(data.shot)}" (BLOG_SHOTS)`)
    if (!data.caption) throw new Error(`${file}: bloco shot sem caption`)
    return { kind: 'shot', shot: data.shot as BlogShot, caption: String(data.caption) }
  }
  if (!data.q || !data.a) throw new Error(`${file}: bloco card sem q ou a`)
  return { kind: 'card', q: String(data.q), a: String(data.a), source: data.source as string | undefined }
}

const SOURCES = /^fontes$/i

/** "https://www.planalto.gov.br/ccivil_03/..." -> "planalto.gov.br": shown small next to each source */
export function sourceDomain(href: string): string {
  return new URL(href).hostname.replace(/^www\./, '')
}

/** A link whose text is a URL or a bare domain path ("https://...", "www.x.com/y") instead of the name of the source */
function isUrlText(text: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(text) || /^[\w-]+(\.[\w-]+)+\/\S+$/.test(text)
}

/** A short cell that is a date, a range or a number ("23/11 a 6/12", "1 e 2", "R$ 81,00"): kept on one line */
function isFigure(text: string): boolean {
  return text.length <= 24 && /\d/.test(text) && /^[\d\s/.,:%ºª°R$hx+–-]*(?:\s(?:a|e|até|de)\s[\d\s/.,:%ºª°R$hx+–-]*)*$/.test(text)
}

const squash = (text: string) => text.replace(/\s+/g, ' ')

function parseJsonField<T>(raw: string | undefined, key: string, file: string): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${file}: "${key}" do front matter precisa ser JSON numa linha`)
  }
}

/**
 * Cover and facts of the article (prd-blog-v2 RF-V1/RF-V2): short values and labels, and every value must be written in
 * the article itself (title, summary, description or body): a cover never brings a number the text does not back.
 */
function parseCover(data: Record<string, string>, body: string, file: string): { cover: BlogCover | null, facts: BlogFact[] } {
  const text = squash([data.title, data.summary, data.description, body].join(' '))
  const check = (item: { value?: unknown, label?: unknown }, key: string) => {
    if (typeof item?.value !== 'string' || typeof item.label !== 'string' || !item.value.trim() || !item.label.trim()) {
      throw new Error(`${file}: "${key}" pede value e label em texto`)
    }
    if (item.value.length > 12) throw new Error(`${file}: "${key}" com value "${item.value}" longo demais (até 12 caracteres)`)
    if (item.label.length > 48) throw new Error(`${file}: "${key}" com label longo demais (até 48 caracteres)`)
    if (!text.includes(squash(item.value))) throw new Error(`${file}: "${key}" mostra "${item.value}", que não está escrito no artigo`)
  }
  const cover = parseJsonField<BlogCover>(data.cover, 'cover', file)
  if (cover) check(cover, 'cover')
  const facts = parseJsonField<BlogFact[]>(data.facts, 'facts', file) ?? []
  if (!Array.isArray(facts) || facts.length > 3) throw new Error(`${file}: "facts" é uma lista de até 3 itens`)
  for (const f of facts) {
    check(f, 'facts')
    if (!BLOG_FACT_ICONS.includes(f.icon as BlogFactIcon)) throw new Error(`${file}: ícone desconhecido "${String(f.icon)}" em facts (${BLOG_FACT_ICONS.join(', ')})`)
  }
  return {
    cover: cover ? { value: cover.value, label: cover.label } : null,
    facts: facts.map(f => ({ value: f.value, label: f.label, icon: f.icon })),
  }
}

const EMBEDS = new Set(['quiz', 'cta', 'tool', 'card', 'shot'])
const MARKER = (i: number) => `<!--blog-embed:${i}-->`

export function parseArticle(source: string, file: string, slug: string): BlogArticle {
  if (!SLUG.test(slug)) throw new Error(`${file}: slug inválido "${slug}" (use minúsculas, números e hífen)`)
  const { data, body } = parseFrontMatter(source, file)
  for (const key of ['title', 'description', 'category', 'area', 'author', 'published'] as const) {
    if (!data[key]) throw new Error(`${file}: falta "${key}" no front matter`)
  }
  if (!(data.category! in BLOG_CATEGORIES)) throw new Error(`${file}: categoria desconhecida "${data.category}"`)
  if (!BLOG_AREAS.includes(data.area as BlogArea)) throw new Error(`${file}: área desconhecida "${data.area}"`)
  const updated = data.updated || data.published!
  if (!DATE.test(data.published!) || !DATE.test(updated)) throw new Error(`${file}: datas em AAAA-MM-DD`)
  if (data.description!.length > 170) throw new Error(`${file}: description com mais de 170 caracteres`)
  if (data.featured && !['true', 'false'].includes(data.featured)) throw new Error(`${file}: featured é true ou false`)
  if (data.context && data.context.length > 40) throw new Error(`${file}: context com mais de 40 caracteres`)
  const { cover, facts } = parseCover(data, body, file)

  const embeds: BlogSegment[] = []
  const toc: BlogArticle['toc'] = []
  const links: string[] = []
  const usedIds = new Set<string>()
  /** The ## section being rendered: inside "Fontes" a link must name the source and gets its domain (prd-blog-v2 RF-L2) */
  let inSources = false

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = plainText(tokens)
        let id = slugify(text)
        for (let n = 2; usedIds.has(id); n++) id = `${slugify(text)}-${n}`
        usedIds.add(id)
        if (depth === 1) throw new Error(`${file}: o título (H1) vem do front matter; use ## no texto`)
        if (depth === 2) {
          toc.push({ id, title: text })
          inSources = SOURCES.test(text)
        }
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`
      },
      code({ text, lang }: Tokens.Code) {
        if (lang && EMBEDS.has(lang)) {
          embeds.push(parseEmbed(lang, text, file))
          return MARKER(embeds.length - 1)
        }
        return `<pre><code>${escapeHtml(text)}</code></pre>\n`
      },
      link({ href, title, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens)
        const t = title ? ` title="${escapeHtml(title)}"` : ''
        if (href.startsWith('/')) {
          links.push(href.split('#')[0]!.split('?')[0]!)
          return `<a href="${escapeHtml(href)}"${t}>${inner}</a>`
        }
        if (/^https?:\/\//.test(href)) {
          const a = `<a href="${escapeHtml(href)}"${t} rel="noopener" target="_blank">${inner}</a>`
          if (!inSources) return a
          const label = plainText(tokens).trim()
          if (isUrlText(label)) throw new Error(`${file}: nas Fontes, o link "${href}" mostra a própria URL; escreva o nome da fonte: [Lei nº 8.213/1991](url)`)
          return a
        }
        if (href.startsWith('#')) return `<a href="${escapeHtml(href)}"${t}>${inner}</a>`
        throw new Error(`${file}: link "${href}" sem / nem https://`)
      },
      table({ header, rows, align }: Tokens.Table) {
        const cell = (c: Tokens.TableCell) => this.parser.parseInline(c.tokens)
        const style = (i: number) => (align[i] ? ` style="text-align:${align[i]}"` : '')
        const labels = header.map(h => escapeHtml(plainText(h.tokens).trim()))
        const head = header.map((h, i) => `<th scope="col"${style(i)}>${cell(h)}</th>`).join('')
        const body = rows.map(row => `<tr>${row.map((c, i) => {
          const text = plainText(c.tokens).trim()
          const cls = [i === 0 ? 'blog-row-title' : '', isFigure(text) ? 'nw' : ''].filter(Boolean).join(' ')
          // On the phone each row is a card and each cell shows its column above it; the row title only when it is a
          // number ("1 e 2" alone says nothing, "Vagas" does)
          const label = i > 0 || isFigure(text) ? ` data-label="${labels[i]}"` : ''
          const tag = i === 0 ? 'th scope="row"' : 'td'
          // Dates inside a longer cell ("De 28/10 a 10/12/2026") never break in the middle
          const html = cls.includes('nw') ? cell(c) : cell(c).replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '<span class="nw">$&</span>')
          return `<${tag}${cls ? ` class="${cls}"` : ''}${label}${style(i)}>${html}</${tag.split(' ')[0]}>`
        }).join('')}</tr>`).join('\n')
        return `<div class="blog-table"><table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody></table></div>\n`
      },
      html() {
        throw new Error(`${file}: HTML cru no Markdown não é aceito (use os blocos quiz, cta, tool e card)`)
      },
    },
  })

  const tokens = marked.lexer(body)
  const faq = extractFaq(tokens)
  // The list of sources gets its own class (simple list, the name as the link) and each item ends with the domains
  // of its links, small ("· planalto.gov.br")
  const html = marked.parser(tokens).replace(/(<h2 id="fontes">[\s\S]*?<\/h2>\s*)<ol>([\s\S]*?)<\/ol>/, (_m, head: string, items: string) =>
    `${head}<ol class="blog-sources">${items.replace(/<li>([\s\S]*?)<\/li>/g, (_li, inner: string) => {
      const domains = [...new Set([...inner.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => sourceDomain(m[1]!.replace(/&amp;/g, '&'))))]
      return `<li>${inner}${domains.length ? `<span class="blog-src-domain"> · ${domains.map(escapeHtml).join(' · ')}</span>` : ''}</li>`
    })}</ol>`)
  const words = html.replace(/<span class="blog-src-domain">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    + embeds.reduce((n, e) => n + (e.kind === 'quiz' ? e.cards.length * 25 : 0), 0)

  const segments: BlogSegment[] = []
  const parts = html.split(/<!--blog-embed:(\d+)-->/)
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      const chunk = parts[i]!.trim()
      if (chunk) segments.push({ kind: 'html', html: chunk })
    } else {
      segments.push(embeds[Number(parts[i])]!)
    }
  }

  return {
    slug,
    title: data.title!,
    seoTitle: data.seoTitle || data.title!,
    description: data.description!,
    category: data.category as BlogCategory,
    area: data.area as BlogArea,
    author: data.author!,
    published: data.published!,
    updated,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    image: data.image || null,
    summary: data.summary || null,
    pillar: data.pillar || null,
    related: data.related ? data.related.split(',').map(s => s.trim()).filter(Boolean) : [],
    context: data.context || null,
    cover,
    facts,
    featured: data.featured === 'true',
    toc,
    faq,
    segments,
    links,
  }
}

/** `### Question` + the paragraphs under it, inside the `## Perguntas frequentes` section. */
function extractFaq(tokens: Token[]): BlogArticle['faq'] {
  const faq: BlogArticle['faq'] = []
  let inFaq = false
  let current: { q: string, a: string[] } | null = null
  const flush = () => {
    if (current && current.a.length) faq.push({ q: current.q, a: current.a.join(' ') })
    current = null
  }
  for (const t of tokens) {
    if (t.type === 'heading') {
      const h = t as Tokens.Heading
      if (h.depth === 2) {
        flush()
        inFaq = /perguntas frequentes/i.test(h.text)
        continue
      }
      if (inFaq && h.depth === 3) {
        flush()
        current = { q: plainText(h.tokens), a: [] }
        continue
      }
    }
    if (inFaq && current && (t.type === 'paragraph' || t.type === 'list')) {
      current.a.push(t.type === 'paragraph' ? plainText((t as Tokens.Paragraph).tokens) : (t as Tokens.List).items.map(i => plainText(i.tokens)).join('; '))
    }
  }
  flush()
  return faq
}

export function toMeta(article: BlogArticle): BlogMeta {
  const { toc: _toc, faq: _faq, segments: _segments, links: _links, ...meta } = article
  return meta
}
