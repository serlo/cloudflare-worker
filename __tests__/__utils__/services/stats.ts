import { rest } from 'msw'

import { RestResolver } from './utils'

export function givenStats(resolver: RestResolver) {
  global.server.use(rest.get('https://stats.serlo.org:path', resolver))
}

export function defaultStatsServer(): RestResolver {
  return (req, res, ctx) => {
    const path = req.params.path as string

    if (path !== '/login') {
      return res(ctx.status(302), ctx.set('location', '/login'))
    }

    return res(ctx.body('<title>Grafana</title>'))
  }
}
