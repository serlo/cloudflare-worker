import {
  currentTestEnvironment,
  currentTestEnvironmentWhen,
  expectIsJsonResponse,
} from './__utils__'

test('Frontend Sector Identifier URI Validation (block localhost)', async () => {
  globalThis.ALLOW_AUTH_FROM_LOCALHOST = 'false'
  const env = currentTestEnvironmentWhen(
    (config) => config.ALLOW_AUTH_FROM_LOCALHOST === 'false'
  )

  const response = await env.fetch({
    pathname: '/auth/frontend-redirect-uris.json',
  })

  await expectIsJsonResponse(response, [
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback/hydra' }),
  ])
})

test('Frontend Sector Identifier URI Validation (allow localhost)', async () => {
  globalThis.ALLOW_AUTH_FROM_LOCALHOST = 'true'
  const env = currentTestEnvironmentWhen(
    (config) => config.ALLOW_AUTH_FROM_LOCALHOST === 'true'
  )

  const response = await env.fetch({
    pathname: '/auth/frontend-redirect-uris.json',
  })

  await expectIsJsonResponse(response, [
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback/hydra' }),
    'http://localhost:3000/api/auth/callback',
    'http://localhost:3000/api/auth/callback/hydra',
  ])
})

test('Kratos Identity Schema', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch({
    pathname: '/auth/kratos-identity.schema.json',
  })

  expect(response.status).toBe(200)
})
