import { http } from 'msw'

import { currentTestEnvironment, returnsJson } from './__utils__'

const quickbarData = [
  {
    id: '100',
    title: 'Mathematik Startseite',
    path: [],
    isTax: false,
    count: 10000,
  },
]

describe('de.serlo.org/api/stats/quickbar.json', () => {
  beforeEach(() => {
    const url = 'https://serlo.github.io/quickbar-updater/quickbar.json'

    globalThis.server.use(http.get(url, returnsJson(quickbarData)))
  })

  test('returns json file', async () => {
    const env = currentTestEnvironment()
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/api/stats/quickbar.json',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toEqual(
      expect.stringContaining('application/json'),
    )

    expect(await response.text()).toEqual(
      expect.stringContaining('"title":"Mathematik Startseite"'),
    )
  })
})
