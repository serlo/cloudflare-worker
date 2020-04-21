import { handleRequest, FRONTEND_DOMAIN } from '../src/frontend-proxy'
import { withMockedFetch, hasOkStatus } from './utils'

describe('handleRequest()', () => {
  async function handleUrl(url: string, probability = 0.1) {
    return (await handleRequest(new Request(url), probability)) as Response
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

  describe('chooses backend based on probability', () => {
    test.each([
      [1, 'frontend', true],
      [0, 'no-frontend', false],
    ])(
      'probability=%p',
      async (probability, responseText, useFrontendCookie) => {
        await withMockedFetch(checkFrontendRequest, async () => {
          const req = new Request('https://de.serlo.org/example')
          const res = (await handleRequest(req, probability)) as Response

          expect(await res.text()).toBe(responseText)
          expect(res.headers.get('Set-Cookie')).toBe(
            `useFrontend${probability * 100}=${useFrontendCookie}; path=/`
          )
        })
      }
    )
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
      request.headers.set('Cookie', 'useFrontend75=true;')

      const response = (await handleRequest(request, 0.75)) as Response
      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(await response.text()).toBe('frontend')
    })
  })

  test('do not use fronted when it is disabled via cookie', async () => {
    await withMockedFetch(checkFrontendRequest, async () => {
      const request = new Request('https://de.serlo.org/example')
      request.headers.set('Cookie', 'useFrontend75=false;')

      const response = (await handleRequest(request, 0.75)) as Response
      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(await response.text()).toBe('no-frontend')
    })
  })

  describe('transfers request meta data to backend', () => {
    test.each([true, false])('useFrontend=%p', async (useFrontend) => {
      await withMockedFetch(checkRequestData, async () => {
        const request = new Request('https://de.serlo.org/example')
        request.headers.set('Cookie', `useFrontend20=${useFrontend};`)
        request.headers.set('X-Header', 'foo')

        const response = (await handleRequest(request, 0.2)) as Response
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
        request.headers.set('Cookie', `useFrontend20=${useFrontend};`)

        const response = (await handleRequest(request, 0.2)) as Response
        expect(response.headers.get('X-Header')).toBe('bar')
      })
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const url = 'https://de.serlo.org/enable-frontend'
    const res = await handleUrl(url, 0.15)

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend15=true; path=/')
    expect(await res.text()).toBe('Enable frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const url = 'https://de.serlo.org/disable-frontend'
    const res = await handleUrl(url, 0.15)

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend15=false; path=/')
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
