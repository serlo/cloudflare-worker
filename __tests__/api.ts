import { api, fetchApi } from '../src/api'
import { mockHttpGet, apiReturns } from './_helper'

describe('api()', () => {
  test('uses fetch() for requests to the serlo api', async () => {
    apiReturns({ username: 'inyono' })

    const req = new Request('https://api.serlo.org/graphql', { method: 'POST' })
    const response = (await api(req)) as Response

    expect(await response.json()).toEqual({
      data: { uuid: { username: 'inyono' } },
    })
  })

  describe('returns null if subdomain is not "api"', () => {
    test('url without subdomain', async () => {
      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
    })

    test('url without subdomain different than "api"', async () => {
      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
    })
  })

  test('returns null if path is not /graphql', async () => {
    const response = await api(new Request('https://api.serlo.org/something'))

    expect(response).toBeNull()
  })
})

describe('fetchApi()', () => {
  test('returns the result of fetch()', async () => {
    global.API_SECRET = 'my-secret'

    mockHttpGet('https://api.serlo.org/', (req, res, ctx) => {
      if (req.headers.get('Content-Type') !== 'application/json')
        return res(ctx.status(415))
      if (!req.headers.get('Authorization')?.match(/^Serlo Service=ey/))
        return res(ctx.status(401))

      return res.once(ctx.json({ result: 42 }))
    })

    const request = new Request('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await fetchApi(request)

    expect(await response.text()).toBe('{"result":42}')
  })
})
