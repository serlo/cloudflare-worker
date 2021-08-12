/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { rest } from 'msw'

import { getUuid } from './database'
import { createUrlRegex, RestResolver } from './utils'

export function givenFrontend(resolver: RestResolver) {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: ['frontend'] }), resolver)
  )
}

export function defaultFrontendServer(): RestResolver {
  return (req, res, ctx) => {
    if (req.url.pathname.endsWith('/'))
      return res(
        ctx.status(302),
        ctx.set('location', req.url.href.slice(0, -1))
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
        ctx.set('location', 'https://hydra.serlo.local/' + origin)
      )
    }

    if (req.url.pathname === '/___graphql') return res(ctx.body('graphiql'))

    const instance = req.url.pathname.substr(1, 2)
    const pathname = req.url.pathname.substr(3)

    let content

    if (pathname === '/user/notifications' && instance === 'en') {
      content = 'Notifications'
    } else if (pathname === '/spenden' && instance === 'de') {
      content = 'Spenden'
    } else if (pathname === '') {
      content = instance === 'de' ? 'Startseite' : 'The Open Learning Platform'
    } else if (req.url.pathname === '/en/consent') {
      content = 'Consent'
    } else if (
      req.url.pathname === '/en/event/history' ||
      req.url.pathname === '/en/event/history/201375'
    ) {
      content = 'Event Log'
    } else if (['/search', '/license/detail/1'].includes(pathname)) {
      content = ''
    } else {
      const uuid = getUuid(instance, pathname.length > 0 ? pathname : '/')

      if (uuid == null) return res(ctx.status(404))

      content = uuid.content ?? ''
    }

    return res(
      ctx.set('x-vercel-cache', 'HIT'),
      ctx.body(
        '<script id="__NEXT_DATA__"\n' +
          '<script src="/_next/static/chunks/main-717520089966e528.js"\n' +
          content
      )
    )
  }
}
