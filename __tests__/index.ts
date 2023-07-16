import {
  mockHttpGet,
  returnsText,
  givenUuid,
  currentTestEnvironment,
  expectToBeRedirectTo,
  localTestEnvironment,
} from './__utils__'
import { Instance } from '../src/utils'

describe('Enforce HTTPS', () => {
  const env = currentTestEnvironment()

  test('HTTP URL', async () => {
    const response = await env.fetch({ subdomain: 'en', protocol: 'http' })

    expectToBeRedirectTo(response, env.createUrl({ subdomain: 'en' }), 302)
  })

  test('HTTPS URL', async () => {
    givenUuid({
      __typename: 'Page',
      alias: '/',
      instance: Instance.De,
      content: 'Startseite',
    })

    const response = await env.fetch({ subdomain: 'de', protocol: 'https' })

    expect(await response.text()).toEqual(expect.stringContaining('Startseite'))
  })

  test('Pact Broker', async () => {
    const local = localTestEnvironment()
    mockHttpGet(
      local.createUrl({ subdomain: 'pacts', pathname: '/bar' }),
      returnsText('content'),
    )

    const response = await local.fetch({ subdomain: 'pacts', pathname: '/bar' })

    expect(await response.text()).toBe('content')
  })
})
