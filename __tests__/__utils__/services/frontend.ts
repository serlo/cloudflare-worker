import { rest } from 'msw'

import { getUuid } from './database'
import { createUrlRegex, RestResolver } from './utils'
import { isInstance } from '../../../src/utils'

export function givenFrontend(resolver: RestResolver) {
  globalThis.server.use(
    rest.get(createUrlRegex({ subdomains: ['frontend'] }), resolver),
  )
}

export function defaultFrontendServer(): RestResolver {
  return (req, res, ctx) => {
    if (req.url.pathname.endsWith('/'))
      return res(
        ctx.status(302),
        ctx.set('location', req.url.href.slice(0, -1)),
      )

    if (req.url.pathname === '/_assets/favicon.ico')
      return res(ctx.set('content-type', 'image/vnd.microsoft.icon'))

    if (req.url.pathname === '/_next/static/chunks/main-717520089966e528.js')
      return res(ctx.set('content-type', 'application/javascript'))

    if (req.url.pathname === '/api/frontend/privacy')
      return res(ctx.json(['2020-02-10']))

    if (req.url.pathname === '/api/auth/login') {
      const { origin } = new URL(req.headers.get('referer') ?? '')

      return res(
        ctx.status(302),
        ctx.set(
          'location',
          `https://hydra.serlo.localhost/?referer=${encodeURIComponent(
            origin,
          )}`,
        ),
      )
    }

    if (req.url.pathname === '/___funfunfun') return res(ctx.body('funfunfun'))

    const instance = req.url.pathname.substring(1, 3)
    const pathname = req.url.pathname.substring(3)

    let content: string

    if (pathname === '/user/notifications' && instance === 'en') {
      content = 'Notifications'
    } else if (pathname === '/spenden' && instance === 'de') {
      content = 'Spenden'
    } else if (pathname === '') {
      content = instance === 'de' ? 'Startseite' : 'The Open Learning Platform'
    } else if (req.url.pathname === '/en/consent') {
      content = 'Consent'
    } else if (req.url.pathname === '/informatik') {
      content = 'Informatik'
    } else if (
      req.url.pathname === '/en/event/history' ||
      req.url.pathname === '/en/event/history/201375'
    ) {
      content = 'Event Log'
    } else if (req.url.pathname === '/en/entity/unrevised') {
      content = 'Unrevised Revisions'
    } else if (req.url.pathname === '/en/entity/repository/add-revision/123') {
      content = 'Edit Page'
    } else if (req.url.pathname === '/en/event/history/user/1/arekkas') {
      content = 'arekkas'
    } else if (req.url.pathname === '/en/content-only/1555') {
      content = 'Article (no header)'
    } else if (
      ['/search', '/license/detail/1', '/taxonomy/term/create/10/10'].includes(
        pathname,
      )
    ) {
      content = ''
    } else if (isInstance(instance)) {
      const uuid = getUuid(instance, pathname.length > 0 ? pathname : '/')

      if (uuid == null) return res(ctx.status(404))

      content = uuid.content ?? ''
    } else {
      return res(ctx.status(404))
    }

    return res(
      ctx.set('x-vercel-cache', 'HIT'),
      ctx.body(
        '<script id="__NEXT_DATA__"\n' +
          '<script src="/_next/static/chunks/main-717520089966e528.js"\n' +
          content,
      ),
    )
  }
}
