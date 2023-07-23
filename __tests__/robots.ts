import { currentTestEnvironmentWhen } from './__utils__'

test('Disallow robots in non-productive environments', async () => {
  const env = currentTestEnvironmentWhen(
    (config) => config.ENVIRONMENT !== 'production',
  )

  const response = await env.fetch({ subdomain: 'de', pathname: '/robots.txt' })

  expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
})

test('Return explicit robots rules in production', async () => {
  const env = currentTestEnvironmentWhen(
    (config) => config.ENVIRONMENT === 'production',
  )
  env.cfEnv.ENVIRONMENT = 'production'

  const request = new Request('https://de.serlo.org/robots.txt')
  const response = await env.fetchRequest(request)
  const text = await response.text()

  expect(text).toContain('User-agent: *')
  expect(text).toContain('Disallow: /backend')
})
