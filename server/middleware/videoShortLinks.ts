import { serverShortLink, videoShortLinks } from '../../app/utils/shortLinks'

// /edital and the per-video short links (/yt27 ... /tk199): 302 to the target with the campaign (app/utils/shortLinks.ts).
// Not routeRules: those would be compiled into the client router and break the bundle budget, and /edital reads the
// user agent. The answer depends on it, so no shared cache keeps it.
const links = videoShortLinks()

export default defineEventHandler((event) => {
  const to = serverShortLink(event.path.split('?')[0]!, getHeader(event, 'user-agent'), links)
  if (!to) return
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Vary', 'User-Agent')
  return sendRedirect(event, to, 302)
})
