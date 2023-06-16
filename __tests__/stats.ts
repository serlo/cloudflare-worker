import { rest } from 'msw'

import {
  createUrlRegex,
  currentTestEnvironment,
  expectToBeRedirectTo,
  TestEnvironment,
} from './__utils__'

let env: TestEnvironment

beforeEach(() => {
  env = currentTestEnvironment()
  mockStatsServer()
})

test('Redirect of https://stats.serlo.org/ is not changed by CF worker', async () => {
  const response = await env.fetch({ subdomain: 'stats' })

  expectToBeRedirectTo(
    response,
    env.createUrl({ subdomain: 'stats', pathname: '/login' }),
    302
  )
})

test('Response of https://stats.serlo.org/login is not changed by CF worker', async () => {
  const response = await env.fetch({ subdomain: 'stats', pathname: '/login' })

  expect(await response.text()).toEqual(
    expect.stringContaining('<title>Grafana</title>')
  )
})

function mockStatsServer() {
  globalThis.server.use(
    rest.get(createUrlRegex({ subdomains: ['stats'] }), (req, res, ctx) => {
      return req.url.pathname !== '/login'
        ? res(ctx.status(302), ctx.set('location', '/login'))
        : res(ctx.body('<title>Grafana</title>'))
    })
  )
}
