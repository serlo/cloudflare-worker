import { handleRequest, FRONTEND_DOMAIN } from '../src/frontend-proxy'
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

        expect(await response.text()).toBe('frontend')
        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
    })
  })

  test('uses frontend when it is enabled via cookie', async () => {
    await withMockedFetch(checkFrontendRequest, async () => {
      const request = new Request('https://de.serlo.org/example')
      request.headers.set('Cookie', 'useFrontend=true;')

      const response = (await handleRequest(request)) as Response
      expect(await response.text()).toBe('frontend')
    })
  })

  describe('transfers request meta data to backend', () => {
    test.each([true, false])('useFrontend=%p', async (useFrontend) => {
      await withMockedFetch(checkRequestData, async () => {
        const request = new Request('https://de.serlo.org/example')
        request.headers.set('Cookie', `useFrontend=${useFrontend};`)
        request.headers.set('X-Header', 'foo')

        const response = (await handleRequest(request)) as Response
        expect(await response.text()).toBe('header-shown')
      })

      async function checkRequestData(request: Request) {
        return request.headers.get('X-Header') === 'foo'
          ? new Response('header-shown')
          : new Response('no-header')
      }
    })
  })

  describe('transfers response meta data from backend', () => {
    test.each([true, false])('useFrontend=%p', async (useFrontend) => {
      const targetResponse = new Response('hello', {
        headers: {
          'X-Header': 'bar',
        },
      })

      await withMockedFetch(targetResponse, async () => {
        const request = new Request('https://de.serlo.org/example')
        request.headers.set('Cookie', `useFrontend=${useFrontend};`)

        const response = (await handleRequest(request)) as Response
        expect(response.headers.get('X-Header')).toBe('bar')
      })
    })
  })

  test('do not use fronted when it is disabled via cookie', async () => {
    await withMockedFetch(checkFrontendRequest, async () => {
      const request = new Request('https://de.serlo.org/example')
      request.headers.set('Cookie', 'useFrontend=false;')

      const response = (await handleRequest(request)) as Response
      expect(await response.text()).toBe('no-frontend')
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const url = 'https://de.serlo.org/enable-frontend'
    const res = await handleUrl(url)

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend=true; path=/')
    expect(await res.text()).toBe('Enable frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const url = 'https://de.serlo.org/disable-frontend'
    const res = await handleUrl(url)

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend=false; path=/')
    expect(await res.text()).toBe('Disable frontend')
  })
})

async function checkFrontendRequest(req: Request): Promise<Response> {
  if (new URL(req.url).hostname === FRONTEND_DOMAIN) {
    return new Response('frontend')
  } else {
    return new Response('no-frontend')
  }
}
