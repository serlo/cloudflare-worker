import { rest } from 'msw'

import { currentTestEnvironment } from './__utils__'

describe('de.serlo.org/api/stats/quickbar.json', () => {
  beforeEach(() => {
    setupArrrg()
  })

  test('returns json file', async () => {
    const env = currentTestEnvironment()
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/api/stats/quickbar.json',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')

    expect(await response.text()).toEqual(
      expect.stringContaining('"title":"Mathematik Startseite"')
    )
  })

  function setupArrrg() {
    globalThis.server.use(
      rest.get(
        'https://serlo.github.io/quickbar-updater/quickbar.json',
        (_req, res, ctx) => {
          return res(
            ctx.set('content-type', 'application/json'),
            ctx.body(
              '[{"id":"100","title":"Mathematik Startseite","path":[],"isTax":false,"count":10000}]'
            )
          )
        }
      )
    )
  }
})
