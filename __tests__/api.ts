import { fetchApi } from '../src/api'
import { mockFetch } from './_helper'

describe('fetchApi()', () => {
  let mockedFetch: ReturnType<typeof mockFetch>
  let response: Response

  beforeAll(async () => {
    global.API_SECRET = 'my-secret'

    mockedFetch = mockFetch({ 'https://api.serlo.org/': '{ "result": 42 }' })
    response = await fetchApi('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  test('returns the result of fetch()', async () => {
    expect(await response.text()).toBe('{ "result": 42 }')
  })

  test('transfers meta data to fetch()', () => {
    const apiRequest = mockedFetch.getRequestFor('https://api.serlo.org/')

    expect(apiRequest.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', () => {
    const apiRequest = mockedFetch.getRequestFor('https://api.serlo.org/')

    expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service=ey/)
  })
})
