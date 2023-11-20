import { http, HttpResponse, ResponseResolver } from 'msw'

import { getUuid } from './database'
import { createUrlRegex, responseWithContentType } from './utils'
import { createNotFoundResponse, isInstance, Url } from '../../../src/utils'

export function givenFrontend(resolver: ResponseResolver) {
  globalThis.server.use(
    http.get(createUrlRegex({ subdomains: ['frontend'] }), resolver),
  )
}

export function defaultFrontendServer(): ResponseResolver {
  return ({ request }) => {
    const url = Url.fromRequest(request)

    if (url.pathname.endsWith('/'))
      return Response.redirect(url.href.slice(0, -1), 302)

    if (url.pathname === '/_assets/favicon.ico')
      return responseWithContentType('image/vnd.microsoft.icon')

    if (url.pathname === '/_next/static/chunks/main-717520089966e528.js')
      return responseWithContentType('application/javascript')

    if (url.pathname === '/api/frontend/privacy')
      return HttpResponse.json(['2020-02-10'])

    if (url.pathname === '/api/auth/login') {
      const { origin } = new URL(request.headers.get('referer') ?? '')
      const referer = encodeURIComponent(origin)
      const redirectUrl = `https://hydra.serlo.localhost/?referer=${referer}`

      return Response.redirect(redirectUrl, 302)
    }

    if (url.pathname === '/___funfunfun') return new Response('funfunfun')

    const instance = url.pathname.substring(1, 3)
    const pathname = url.pathname.substring(3)

    let content: string

    if (pathname === '/user/notifications' && instance === 'en') {
      content = 'Notifications'
    } else if (pathname === '/spenden' && instance === 'de') {
      content = 'Spenden'
    } else if (pathname === '') {
      content = instance === 'de' ? 'Startseite' : 'The Open Learning Platform'
    } else if (url.pathname === '/en/consent') {
      content = 'Consent'
    } else if (url.pathname === '/informatik') {
      content = 'Informatik'
    } else if (
      url.pathname === '/en/event/history' ||
      url.pathname === '/en/event/history/201375'
    ) {
      content = 'Event Log'
    } else if (url.pathname === '/en/entity/unrevised') {
      content = 'Unrevised Revisions'
    } else if (url.pathname === '/en/entity/repository/add-revision/123') {
      content = 'Edit Page'
    } else if (url.pathname === '/en/event/history/user/1/arekkas') {
      content = 'arekkas'
    } else if (url.pathname === '/en/content-only/1555') {
      content = 'Article (no header)'
    } else if (
      ['/search', '/license/detail/1', '/taxonomy/term/create/10/10'].includes(
        pathname,
      )
    ) {
      content = ''
    } else if (isInstance(instance)) {
      const uuid = getUuid(instance, pathname.length > 0 ? pathname : '/')

      if (uuid == null) return createNotFoundResponse()

      content = uuid.content ?? ''
    } else {
      return createNotFoundResponse()
    }

    const body =
      '<script id="__NEXT_DATA__"\n' +
      '<script src="/_next/static/chunks/main-717520089966e528.js"\n' +
      content

    return new Response(body, { headers: { 'x-vercel-cache': 'HIT' } })
  }
}
