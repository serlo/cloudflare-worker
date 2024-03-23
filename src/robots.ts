import { Url, CFEnvironment } from './utils'

const robotsProduction = `User-agent: *
Disallow: /page/revision/revisions/
Disallow: /page/revision/revision/
Disallow: /page/revision/
Disallow: /entity/repository/history/
Disallow: /entity/repository/compare/
Disallow: /backend
Disallow: /users
Disallow: /horizon
Disallow: /flag
Disallow: /license
Disallow: /uuid/recycle-bin
Disallow: /navigation/
Disallow: /authorization/
Disallow: /pages
Disallow: /uuid/recycle-bin
Disallow: /*/entity/trash-bin`

export function robotsTxt(request: Request, env: CFEnvironment) {
  const url = Url.fromRequest(request)
  if (url.pathname !== '/robots.txt') return null

  return new Response(
    env.ENVIRONMENT === 'production'
      ? robotsProduction
      : 'User-agent: *\nDisallow: /\n',
  )
}
