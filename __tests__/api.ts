import { fetchApi } from '../src/api'
import { mockFetch } from './utils'

describe('fetchApi()', () => {
  beforeAll(() => {
    global.API_SECRET = 'my-secret'
  })

  test('is a proxy for fetch()', async () => {
    const mockedFetch = mockFetch({
      'https://api.serlo.org/': '{ "result": 42 }',
    })

    const request = new Request('https://api.serlo.org/')
    const response = await fetchApi(request, {
      headers: { 'Content-Type': 'application/json' },
    })

    expect(await response.text()).toBe('{ "result": 42 }')
    expect(mockedFetch).toHaveBeenCalledTimes(1)

    const requestArg = mockedFetch.mock.calls[0][0]
    expect(requestArg.url).toBe('https://api.serlo.org/')
    expect(requestArg.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', async () => {
    const mockedFetch = mockFetch({ 'https://api.serlo.org/': '' })

    await fetchApi('https://api.serlo.org')

    const request = mockedFetch.mock.calls[0][0]
    expect(request.headers.get('Authorization')).toMatch(/^Serlo Service=eyJh/)
  })
})
