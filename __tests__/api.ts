import { rest} from 'msw'
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
/*  let fetchApi: FetchMock

  beforeEach(() => {
    fetchApi = mockFetch({ 'https://api.serlo.org/graphql': '<api-result>' })
  })
*/

  test('uses fetchApi() for requests to the serlo api', async () => {
    server.use(
      rest.get('https://api.serlo.org/graphql', (_req, res, ctx) => {
        return res.once(ctx.status(200), ctx.body('<api-result>'))
      })
    )
    const req = new Request('https://api.serlo.org/graphql')
    const response = (await api(req)) as Response //zweite argument löschen)) as Response

    expect(await response.text()).toBe('<api-result>')
    expect(fetchApi).toHaveExactlyOneRequestTo('https://api.serlo.org/graphql')   //könnte man löschen
  })

  describe('returns null if subdomain is not "api"', () => {             //jest.fn wie bei Utils NotToHaveBeenCall
    test('url without subdomain', async () => {
      server.use(
        rest.get('https://serlo.org/graphql', (_req, res, ctx) => {
          return res.once(ctx.status(200), ctx.body('<api-result>'))
        })
      )
      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
      //expect(fetchApi.mock).not.toHaveBeenCalled()
    })

    test('url without subdomain different than "api"', async () => {
      server.use(
        rest.get('https://serlo.org/graphql', (_req, res, ctx) => {
          return res.once(ctx.status(200), ctx.body('<api-result>'))
        })
      )
      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  test('returns null if path is not /graphql', async () => {
    server.use(
      rest.get('https://api.serlo.org/something', (_req, res, ctx) => {
        return res.once(ctx.status(200), ctx.body('<api-result>'))
      })
    )
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
    response = await fetchApi('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  test('returns the result of fetch()', async () => {
    expect(await response.text()).toBe('{ "result": 42 }')
  })

  test('transfers meta data to fetch()', () => {
    server.use(
      rest.get('https://api.serlo.org/something', (_req, res, ctx) => {
        return res.once(ctx.status(200), ctx.body('<api-result>'))
      })
    )
    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', () => {
    server.use(
      rest.get('https://api.serlo.org/something', (_req, res, ctx) => {
        return res.once(ctx.status(200), ctx.body('<api-result>'))
      })
    )
    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service=ey/)
  })
})
