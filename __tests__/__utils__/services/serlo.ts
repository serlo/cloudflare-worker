import { rest } from 'msw'

import { getUuid } from './database'
import { RestResolver, createUrlRegex } from './utils'
import { Url, Instance } from '../../../src/utils'

export function givenSerlo(resolver: RestResolver) {
  globalThis.server.use(
    rest.get(createUrlRegex({ subdomains: Object.values(Instance) }), resolver),
    rest.post(
      createUrlRegex({ subdomains: Object.values(Instance) }),
      resolver,
    ),
  )
}

export function defaultSerloServer(): RestResolver {
  return (req, res, ctx) => {
    const url = new Url(req.url.href)

    if (url.pathname.startsWith('/auth/') || url.pathname === '/user/register')
      return res(ctx.body(''))

    let content

    if (url.pathname === '/spenden' && url.subdomain === 'de') {
      content = 'Spenden'
    } else if (url.pathname === '/') {
      content =
        url.subdomain === 'de' ? 'Startseite' : 'The Open Learning Platform'
    } else if (url.pathname === '/search') {
      content = url.searchParams.get('q') ?? ''
    } else if (
      url.pathname === '/license/detail/1' ||
      url.pathname === '/taxonomy/term/create/10/10'
    ) {
      content = ''
    } else if (url.pathname.startsWith('/entity/repository/add-revision')) {
      // add-revision-old/… and add-revision/…
      content = ''
    } else {
      const uuid = getUuid(url.subdomain, url.pathname)

      if (uuid == null) return res(ctx.status(404))

      content = uuid.content ?? ''
    }

    return res(
      ctx.set('x-powered-by', 'PHP'),
      ctx.body('<html class="fuelux"\n' + content),
    )
  }
}
