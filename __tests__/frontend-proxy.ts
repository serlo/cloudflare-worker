import { handleRequest, formatFrontendUsageCookie } from '../src/frontend-proxy'

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
    expect(res.headers.get('Set-Cookie')).toBe(formatFrontendUsageCookie(true))
    expect(await res.text()).toBe('Enable frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const url = 'https://de.serlo.org/disable-frontend'
    const res = (await handleRequest(new Request(url))) as Response

    expect(res).not.toBeNull()
    expect(res.headers.get('Set-Cookie')).toBe(formatFrontendUsageCookie(false))
    expect(await res.text()).toBe('Disable frontend')
  })
})

test('formatFrontendUsageCookie()', () => {
  expect(formatFrontendUsageCookie(true)).toBe('useFrontend=true; path=/')
  expect(formatFrontendUsageCookie(false)).toBe('useFrontend=false; path=/')
})
