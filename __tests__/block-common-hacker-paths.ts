import { givenUuid, currentTestEnvironment } from './__utils__'
import { Instance } from '../src/utils'

describe('blocks common hacker paths', () => {
  const env = currentTestEnvironment()

  beforeEach(() => {
    givenUuid({
      __typename: 'Article',
      alias: '/legitimate-path',
      content: 'legitimate content',
      instance: Instance.En,
    })
  })

  test.each([
    '/.env',
    '/.git',
    '/.aws/config',
    '/.ssh/id_rsa',
    '/.docker/config',
    '/config.json',
    '/config.php',
    '/configuration.php',
  ])('blocks file-based attack path: %s', async (path) => {
    const response = await env.fetch({ subdomain: 'en', pathname: path })
    expect(response.status).toBe(404)
  })

  test.each([
    '/wp-admin',
    '/wp-login.php',
    '/wp-content/plugins',
    '/wp-includes/file.php',
    '/xmlrpc.php',
    '/wp-config.php',
  ])('blocks WordPress-related path: %s', async (path) => {
    const response = await env.fetch({ subdomain: 'en', pathname: path })
    expect(response.status).toBe(404)
  })

  test.each([
    '/phpmyadmin',
    '/pma',
    '/admin',
    '/administrator',
    '/cpanel',
    '/plesk',
    '/webmail',
    '/joomla/admin',
    '/drupal/admin',
  ])('blocks CMS and admin panel path: %s', async (path) => {
    const response = await env.fetch({ subdomain: 'en', pathname: path })
    expect(response.status).toBe(404)
  })

  test.each([
    '/test.php',
    '/index.asp',
    '/default.aspx',
    '/login.jsp',
    '/script.cgi',
    '/file.pl',
  ])('blocks disallowed file extension: %s', async (path) => {
    const response = await env.fetch({ subdomain: 'en', pathname: path })
    expect(response.status).toBe(404)
  })

  test('legitimate paths still work and redirect properly', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/legitimate-path',
    })
    // This should not be blocked and should work as normal
    expect(response.status).not.toBe(404)
  })
})
