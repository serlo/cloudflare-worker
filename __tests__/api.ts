import { api, fetchApi } from '../src/api'
import {
  FetchMock,
  serverMock,
  returnResponseText,
  returnResponseJson,
} from './_helper'

describe('api()', () => {
  test('uses fetch() for requests to the serlo api', async () => {
    beforeEach(() => {
      serverMock(
        'https://api.serlo.org/graphql',
        returnResponseText('<api-result>')
      )
    })

    const req = new Request('https://api.serlo.org/graphql')
    const response = (await api(req)) as Response

    expect(await response.text()).toBe('<api-result>')
  })

  describe('returns null if subdomain is not "api"', () => {
    test('url without subdomain', async () => {
      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    test('url without subdomain different than "api"', async () => {
      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  test('returns null if path is not /graphql', async () => {
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

    serverMock(
      'https://api.serlo.org/',
      returnResponseJson({
        result: 42,
      })
    )

    const request = new Request('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
    response = await fetchApi(request)
  })

  test('returns the result of fetch()', async () => {
    expect(await response.text()).toBe('{ "result": 42 }')
  })

  test('transfers meta data to fetch()', () => {
    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', () => {
    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service=ey/)
  })
})
