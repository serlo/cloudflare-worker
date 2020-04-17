import { handleRequest, formatFrontendCookie } from '../src/frontend-proxy'

describe('handleRequest()', () => {
  describe('returns null if language tenant is not "de"', () => {
    test.each([
      'https://serlo.org/',
      'http://ta.serlo.org/',
      'https://stats.serlo.org/',
      'http://en.serlo.org/math',
    ])('URL is %p', async (url) => {
      expect(await handleRequest(new Request(url))).toBeNull()
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const url = 'https://de.serlo.org/enable-frontend'
    const res = (await handleRequest(new Request(url))) as Response

    expect(res).not.toBeNull()
    expect(res.headers.get('Set-Cookie')).toBe(formatFrontendCookie(true))
    expect(await res.text()).toBe('Enable frontend')
  })
})

test('formatFrontendCookie()', () => {
  expect(formatFrontendCookie(true)).toBe('useFrontend=true; path=/')
  expect(formatFrontendCookie(false)).toBe('useFrontend=false; path=/')
})
