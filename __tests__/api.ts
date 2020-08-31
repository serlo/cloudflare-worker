import { rest } from 'msw'
import { setupServer } from 'msw/node'

import { api, fetchApi } from '../src/api'
import { mockFetch, FetchMock } from './_helper'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

describe('api()', () => {
  function serverMock(url_e: string, body_e: string) {
    server.use(
      rest.get(url_e, (_req, res, ctx) => {
        return res.once(ctx.status(200), ctx.body(body_e))
      })
    )
  }

  test('uses fetch() for requests to the serlo api', async () => {
    serverMock('https://api.serlo.org/graphql', '<api-result>')

    const req = new Request('https://api.serlo.org/graphql')
    const response = (await api(req)) as Response

    expect(await response.text()).toBe('<api-result>')
  })

  describe('returns null if subdomain is not "api"', () => {
    test('url without subdomain', async () => {
      serverMock('https://api.serlo.org/graphql', '<api-result>')

      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    test('url without subdomain different than "api"', async () => {
      serverMock('https://stats.serlo.org/graphql', '<api-result>')

      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  test('returns null if path is not /graphql', async () => {
    serverMock('https://api.serlo.org/something', '<api-result>')

    const response = await api(new Request('https://api.serlo.org/something'))

    expect(response).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('fetchApi()', () => {
  let fetch: FetchMock
  let response: Response

  beforeAll(async () => {
    global.API_SECRET = 'my-secret'

    fetch = mockFetch({ 'https://api.serlo.org/': '{ "result": 42 }' })
    const request = new Request('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
    response = await fetchApi(request)
  })

  test('returns the result of fetch()', async () => {
    expect(await response.text()).toBe('{ "result": 42 }')
  })

  function serverMock(url_e: string, body_e: string) {
    server.use(
      rest.get(url_e, (_req, res, ctx) => {
        return res.once(ctx.status(200), ctx.body(body_e))
      })
    )
  }

  test('transfers meta data to fetch()', () => {
    serverMock('https://api.serlo.org/', '<api-result>')

    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', () => {
    serverMock('https://api.serlo.org/', '<api-result>')

    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service=ey/)
  })
})
