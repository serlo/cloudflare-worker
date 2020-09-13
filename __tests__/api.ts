import { api, fetchApi } from '../src/api'
import { mockFetch, FetchMock, serverMock, returnResponseText } from './_helper'

describe('api()', () => {
  test('uses fetch() for requests to the serlo api', async () => {
    serverMock(
      'https://api.serlo.org/graphql',
      returnResponseText('<api-result>')
    )

    const req = new Request('https://api.serlo.org/graphql')
    const response = (await api(req)) as Response

    expect(await response.text()).toBe('<api-result>')
  })

  describe('returns null if subdomain is not "api"', () => {
    test('url without subdomain', async () => {
      serverMock(
        'https://api.serlo.org/graphql',
        returnResponseText('<api-result>')
      )

      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    test('url without subdomain different than "api"', async () => {
      serverMock(
        'https://stats.serlo.org/graphql',
        returnResponseText('<api-result>')
      )

      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  test('returns null if path is not /graphql', async () => {
    serverMock(
      'https://api.serlo.org/something',
      returnResponseText('<api-result>')
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
    const request = new Request('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
    response = await fetchApi(request)
  })

  test('returns the result of fetch()', async () => {
    expect(await response.text()).toBe('{ "result": 42 }')
  })

  test('transfers meta data to fetch()', () => {
    serverMock('https://api.serlo.org/', returnResponseText('<api-result>'))

    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', () => {
    serverMock('https://api.serlo.org/', returnResponseText('<api-result>'))

    const apiRequest = fetch.getRequestTo('https://api.serlo.org/') as Request
    expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service=ey/)
  })
})
