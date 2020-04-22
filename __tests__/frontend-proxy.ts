import {
  handleRequest,
  FRONTEND_DOMAIN,
  createApiQuery,
} from '../src/frontend-proxy'
import { createJsonResponse } from '../src/utils'
import { withMockedFetch, hasOkStatus } from './utils'

const TEST_ALLOWED_TYPES = ['User', 'Article']
const TEST_URLS = [
  'https://de.serlo.org/math',
  'https://de.serlo.org/10',
  'https://de.serlo.org/_nextexample-url',
]

describe('handleRequest()', () => {
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
    describe.each(TEST_URLS)('url=%p', (url) => {
      test.each([
        [1, TEST_ALLOWED_TYPES[0], 'frontend', true],
        [1, TEST_ALLOWED_TYPES[1], 'frontend', true],
        [0, TEST_ALLOWED_TYPES[0], 'no-frontend', false],
        [0, TEST_ALLOWED_TYPES[1], 'no-frontend', false],
      ])(
        'probability=%p',
        async (probability, typename, responseText, useFrontendCookie) => {
          await withMockedFetch(
            [createApiResponse(typename), checkFrontendRequest],
            async () => {
              const res = await handleUrl(url, probability)

              expect(await res.text()).toBe(responseText)
              expect(res.headers.get('Set-Cookie')).toBe(
                `useFrontend${probability * 100}=${useFrontendCookie}; path=/`
              )
            }
          )
        }
      )
    })
  })

  test('start page can be forwarded to frontend', async () => {
    await withMockedFetch([checkFrontendRequest], async () => {
      const res = await handleUrl('https://de.serlo.org/', 1)

      expect(await res.text()).toBe('frontend')
      expect(res.headers.get('Set-Cookie')).toBe(`useFrontend100=true; path=/`)
    })
  })

  describe('returns null for not allowed taxonomy types', () => {
    test.each(['Page', 'TaxonomyTerm'])('typename=%p', async (typename) => {
      await withMockedFetch([createApiResponse(typename)], async () => {
        expect(await handleUrl(TEST_URLS[0], 1)).toBeNull()
      })
    })
  })

  test('returns null for unknown paths', async () => {
    await withMockedFetch([createApiErrorResponse()], async () => {
      expect(await handleUrl(TEST_URLS[0], 1)).toBeNull()
    })
  })

  describe('requests to /_next and /_assets always resolve to frontend', () => {
    test.each([
      'https://de.serlo.org/_next/script.js',
      'https://de.serlo.org/_next/img/picture.svg',
      'https://de.serlo.org/_assets/script.js',
      'https://de.serlo.org/_assets/img/picture.svg',
    ])('URL is %p', async (url) => {
      await withMockedFetch([checkFrontendRequest], async () => {
        const response = await handleUrl(url)

        expect(await response.text()).toBe('frontend')
        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
    })
  })

  describe('uses frontend when it is enabled via cookie', () => {
    test.each(TEST_URLS)('URL=%p', async (url) => {
      await withMockedFetch(
        [createApiResponse(), checkFrontendRequest],
        async () => {
          const res = await handleUrl(url, 0, 'useFrontend0=true;')

          expect(res.headers.get('Set-Cookie')).toBeNull()
          expect(await res.text()).toBe('frontend')
        }
      )
    })
  })

  describe('do not use fronted when it is disabled via cookie', () => {
    test.each(TEST_URLS)('URL=%p', async (url) => {
      await withMockedFetch(
        [createApiResponse(), checkFrontendRequest],
        async () => {
          const res = await handleUrl(url, 1, 'useFrontend100=false;')

          expect(res.headers.get('Set-Cookie')).toBeNull()
          expect(await res.text()).toBe('no-frontend')
        }
      )
    })
  })

  test('creates new response object for calls to frontend', async () => {
    const frontendResponse = new Response('')

    await withMockedFetch([createApiResponse(), frontendResponse], async () => {
      const res = await handleUrl(TEST_URLS[0], 1)
      expect(res).not.toBe(frontendResponse)
    })
  })

  describe('transfers request meta data to backend', () => {
    test.each([true, false])('useFrontend=%p', async (useFrontend) => {
      await withMockedFetch(
        [createApiResponse(), checkRequestData],
        async () => {
          const cookie = `useFrontend20=${useFrontend};`
          const response = await handleUrl(TEST_URLS[0], 0.2, cookie, {
            headers: { 'X-Header': 'foo' },
          })

          expect(await response.text()).toBe('header-shown')
        }
      )

      function checkRequestData(req: Request) {
        const res =
          req.headers.get('X-Header') === 'foo'
            ? new Response('header-shown')
            : new Response('no-header')

        return new Promise<Response>((resolve) => resolve(res))
      }
    })
  })

  describe('transfers response meta data from backend', () => {
    test.each([true, false])('useFrontend=%p', async (useFrontend) => {
      const targetResponse = new Response('', {
        headers: { 'X-Header': 'bar' },
      })

      await withMockedFetch([createApiResponse(), targetResponse], async () => {
        const cookie = `useFrontend20=${useFrontend};`
        const res = await handleUrl(TEST_URLS[0], 0.2, cookie)

        expect(res.headers.get('X-Header')).toBe('bar')
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

test('createApiQuery()', () => {
  expect(createApiQuery('/math')).toBe(
    '{ uuid(alias: { instance: de, path: "/math" }) { __typename } }'
  )
  expect(createApiQuery('hello')).toBe(
    '{ uuid(alias: { instance: de, path: "/hello" }) { __typename } }'
  )
  expect(createApiQuery('/266/')).toBe(
    '{ uuid(alias: { instance: de, path: "/266/" }) { __typename } }'
  )
  expect(createApiQuery('/266')).toBe('{ uuid(id: 266) { __typename } }')
  expect(createApiQuery('/874329')).toBe('{ uuid(id: 874329) { __typename } }')
})

async function handleUrl(
  url: string,
  probability = 0.1,
  cookie?: string,
  reqInit?: RequestInit
) {
  const req = new Request(url, reqInit)

  if (cookie !== undefined) req.headers.set('Cookie', cookie)

  return (await handleRequest(req, probability, TEST_ALLOWED_TYPES)) as Response
}

export function createApiResponse(typename = TEST_ALLOWED_TYPES[0]) {
  return createJsonResponse({ data: { uuid: { __typename: typename } } })
}

function createApiErrorResponse() {
  return createJsonResponse({
    errors: [{ message: 'error' }],
    data: { uuid: null },
  })
}

function checkFrontendRequest(req: Request) {
  const res =
    new URL(req.url).hostname === FRONTEND_DOMAIN
      ? new Response('frontend')
      : new Response('no-frontend')

  return new Promise<Response>((resolve) => resolve(res))
}
