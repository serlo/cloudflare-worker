import {
  givenUuid,
  currentTestEnvironment,
  expectToBeRedirectTo,
} from './__utils__'
import { Instance } from '../src/utils'

describe('Enforce HTTPS', () => {
  const env = currentTestEnvironment()

  test('HTTP URL', async () => {
    const response = await env.fetch({ subdomain: 'en', protocol: 'http' })

    expectToBeRedirectTo(response, env.createUrl({ subdomain: 'en' }), 301)
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
})
