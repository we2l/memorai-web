/**
 * Short addresses written on social posts (social-baigi skill): TikTok without a link in the bio, Shorts whose
 * description does not click and the Instagram bio (prd-entrada-comecar RF-F4). The address typed by hand arrives without UTM, so these redirect on the edge to the
 * entry of /comecar with the campaign of the channel, and the first touch (utils/firstTouch) records it on /comecar.
 * 302 on purpose: the target can change later without browsers caching it.
 */
export const SHORT_LINKS: Record<string, string> = {
  '/tiktok': '/comecar?utm_source=tiktok&utm_medium=social&utm_campaign=perfil',
  '/yt': '/comecar?utm_source=youtube&utm_medium=social&utm_campaign=perfil',
  '/ig': '/comecar?utm_source=instagram&utm_medium=bio',
}

/** The routeRules of the short links (temporary redirects). */
export function shortLinkRules(): Record<string, { redirect: { to: string, statusCode: 302 } }> {
  return Object.fromEntries(Object.entries(SHORT_LINKS).map(([from, to]) => [from, { redirect: { to, statusCode: 302 as const } }]))
}
