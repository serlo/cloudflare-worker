import {
  handleRequest,
  formatFrontendUsageCookie,
  FRONTEND_DOMAIN,
} from '../src/frontend-proxy'
import { withMockedFetch, hasOkStatus } from './utils'

describe('handleRequest()', () => {
  async function handleUrl(url: string) {
    return (await handleRequest(new Request(url))) as Response
  }

  describe('returns null if language tenant is not "de"', () => {
    test.each([
      'https://serlo.org/',
      'http://ta.serlo.org/',
      'https://stats.serlo.org/',
      'http://en.serlo.org/math',
    ])('URL is %p', async (url) => {
      expect(await handleUrl(url)).toBeNull()
    })
  })

  describe('requests to /_next always resolve to frontend', () => {
    test.each([
      'https://de.serlo.org/_next/script.js',
      'https://de.serlo.org/_next/img/picture.svg',
    ])('URL is %p', async (url) => {
      await withMockedFetch(checkFrontendRequest, async () => {
        const response = await handleUrl(url)
        isFrontendResponse(response)
        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const url = 'https://de.serlo.org/enable-frontend'
    const res = await handleUrl(url)

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe(formatFrontendUsageCookie(true))
    expect(await res.text()).toBe('Enable frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const url = 'https://de.serlo.org/disable-frontend'
    const res = await handleUrl(url)

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe(formatFrontendUsageCookie(false))
    expect(await res.text()).toBe('Disable frontend')
  })
})

test('formatFrontendUsageCookie()', () => {
  expect(formatFrontendUsageCookie(true)).toBe('useFrontend=true; path=/')
  expect(formatFrontendUsageCookie(false)).toBe('useFrontend=false; path=/')
})

async function checkFrontendRequest(req: Request): Promise<Response> {
  if (new URL(req.url).hostname === FRONTEND_DOMAIN) {
    return new Response('frontend')
  } else {
    return new Response('no-frontend')
  }
}

async function isFrontendResponse(response: Response) {
  hasOkStatus(response)

  expect(await response.text()).toBe('frontend')
}
