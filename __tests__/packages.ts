import { http } from 'msw'

import { createUrlRegex, currentTestEnvironment } from './__utils__'
import { createNotFoundResponse } from '../src/utils'

const env = currentTestEnvironment()

beforeEach(async () => {
  givenCssOnPackagesServer('/serlo-org-client@10.0.0/main.css')

  await env.cfEnv.PACKAGES_KV.put(
    'serlo-org-client@10',
    'serlo-org-client@10.0.0',
  )
})

test('resolves to specific package version when package name is in PACKAGES_KV', async () => {
  const response = await env.fetch({
    subdomain: 'packages',
    pathname: '/serlo-org-client@10/main.css',
  })

  expectCssResponse(response)
})

test('forwards request when package name is not in PACKAGES_KV', async () => {
  const response = await env.fetch({
    subdomain: 'packages',
    pathname: '/serlo-org-client@10.0.0/main.css',
  })

  expectCssResponse(response)
})

function expectCssResponse(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('text/css')
}

function givenCssOnPackagesServer(pathname: string) {
  globalThis.server.use(
    http.get(createUrlRegex({ subdomains: ['packages'] }), ({ request }) => {
      const url = new URL(request.url)
      return url.pathname === pathname
        ? new Response('', { headers: { 'content-type': 'text/css' } })
        : createNotFoundResponse()
    }),
  )
}
