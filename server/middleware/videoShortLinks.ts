import { videoShortLinks } from '../../app/utils/shortLinks'

// Per-video short links (/yt27 ... /tk199): 302 to /comecar with the utm_content of the video (app/utils/shortLinks.ts).
// Not routeRules: those would be compiled into the client router and break the bundle budget.
const links = videoShortLinks()

export default defineEventHandler((event) => {
  const to = links[event.path.split('?')[0]!]
  if (to) return sendRedirect(event, to, 302)
})
