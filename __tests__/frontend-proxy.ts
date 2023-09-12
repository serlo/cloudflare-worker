import {
  mockHttpGet,
  returnsText,
  givenUuid,
  localTestEnvironment,
  currentTestEnvironment,
  redirectsTo,
  givenFrontend,
  expectSentryEvent,
} from './__utils__'
import { Instance } from '../src/utils'

test('Always choose new frontend as default route', async () => {
  await expectFrontend(
    await currentTestEnvironment().fetch({ subdomain: 'en' })
  )
})

test('No redirect for subjects', async () => {
  givenUuid({
    id: 1555,
    __typename: 'Article',
    alias: '/informatik/1235',
    oldAlias: '/informatik',
    instance: Instance.De,
  })

  const response = await currentTestEnvironment().fetch({
    subdomain: 'de',
    pathname: '/informatik',
  })

  await expectFrontend(response)
})

test('Uses new frontend even when cookie "useLegacyFrontend" is "true"', async () => {
  const env = currentTestEnvironment()
  const request = env.createRequest({ subdomain: 'en' })

  request.headers.append('Cookie', 'useLegacyFrontend=true;')

  await expectFrontend(await env.fetchRequest(request))
})

test('chooses frontend when request contains content api parameter', async () => {
  givenUuid({
    id: 1555,
    __typename: 'Article',
    alias: '/mathe/1555/zylinder',
    instance: Instance.De,
  })
  const response = await currentTestEnvironment().fetch({
    subdomain: 'de',
    pathname: '/mathe/1555/zylinder?contentOnly',
  })

  await expectFrontend(response)
})

describe('when request contains header X-From: legacy-serlo.org', () => {
  let response: Response

  beforeEach(async () => {
    response = await currentTestEnvironment().fetch(
      {
        subdomain: 'en',
        pathname: '/',
      },
      { headers: { 'X-From': 'legacy-serlo.org' } }
    )
  })

  test('still chooses new frontend', async () => {
    await expectFrontend(response)
  })
})

test('reports to sentry when frontend responded with redirect', async () => {
  givenFrontend(redirectsTo('https://frontend.serlo.org/'))
  mockHttpGet('https://frontend.serlo.org/', returnsText('Hello World'))

  const env = localTestEnvironment()
  const redirectResponse = await env.fetch({
    subdomain: 'en',
    pathname: '/math',
  })

  expect(redirectResponse.status).toEqual(302)
  expect(redirectResponse.headers.get('Location')).toEqual(
    'https://frontend.serlo.org/'
  )
  expectSentryEvent({
    message: 'Frontend responded with a redirect',
    level: 'error',
    context: {
      backendUrl: env.createUrl({
        subdomain: 'frontend',
        pathname: '/en/math',
      }),
      location: 'https://frontend.serlo.org/',
    },
  })

  const response = await fetch('https://frontend.serlo.org/')

  expect(response.status).toEqual(200)
  expect(await response.text()).toBe('Hello World')
})

test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
  const backendResponse = new Response('')

  // There is no type checking for the main page, and thus we do not need
  // to mock the api request here
  const response = await localTestEnvironment().fetch({ subdomain: 'en' })

  expect(response).not.toBe(backendResponse)
})

describe('requests to /enable-frontend enable use of frontend', () => {
  let response: Response

  beforeEach(async () => {
    response = await currentTestEnvironment().fetch({
      subdomain: 'en',
      pathname: '/enable-frontend',
    })
  })

  test('shows message that frontend was enabled', async () => {
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Enabled: Use of new frontend')
  })

  test('sets cookie so that new frontend will be used', () => {
    expect(response.headers.get('Set-Cookie')).toEqual(
      expect.stringContaining('useLegacyFrontend=false;')
    )
  })

  test('main page will be loaded after 1 second', () => {
    expect(response.headers.get('Refresh')).toBe('1; url=/')
  })
})

describe('requests to /disable-frontend disable use of frontend', () => {
  let response: Response

  beforeEach(async () => {
    response = await currentTestEnvironment().fetch({
      subdomain: 'en',
      pathname: '/disable-frontend',
    })
  })

  test('shows message that frontend use is disabled', async () => {
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Disabled: Use of new frontend')
  })

  test('sets cookie to that legacy backend will be used', () => {
    expect(response.headers.get('Set-Cookie')).toEqual(
      expect.stringContaining('useLegacyFrontend=true;')
    )
  })

  test('main page will be loaded after 1 second', () => {
    expect(response.headers.get('Refresh')).toBe('1; url=/')
  })
})

async function expectLegacy(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<html class="fuelux"')
  )
  // Tests that backend headers are transferred to client
  expect(response.headers.get('x-powered-by')).toEqual(
    expect.stringContaining('PHP')
  )
}

async function expectFrontend(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<script id="__NEXT_DATA__"')
  )
  // Tests that backend headers are transferred to client
  expect(response.headers.get('x-vercel-cache')).toBeDefined()
}
