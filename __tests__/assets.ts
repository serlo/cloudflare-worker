import { rest } from 'msw'

import {
  createUrlRegex,
  currentTestEnvironment,
  TestEnvironment,
} from './__utils__'

let env: TestEnvironment

beforeEach(() => {
  env = currentTestEnvironment()
  givenAssets({
    '/meta/serlo.jpg': { contentLength: 371895 },
    '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119.png': {
      contentLength: 4774,
    },
    '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922.png': {
      contentLength: 899629,
    },
    '/1658759018166-f30bdef5-b33f-480c-95b9-41b20a7926af.png': {
      contentLength: 490,
    },
  })
})

test('assets.serlo.org/meta/*', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname: '/meta/serlo.jpg',
  })

  expectAsset({ response, expectedStoredContentLength: 371895 })
})

test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname:
      '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119/ashoka.png',
  })

  expectAsset({ response, expectedStoredContentLength: 4774 })
})

test('assets.serlo.org/<hash>/<fileName>.<ext> (with uuid version 4)', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname: '/1658759018166-f30bdef5-b33f-480c-95b9-41b20a7926af/black.png',
  })

  expectAsset({ response, expectedStoredContentLength: 490 })
})

test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname:
      '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922/garden.png',
  })

  expectAsset({ response, expectedStoredContentLength: 899629 })
})

function givenAssets(assets: { [P in string]?: { contentLength: number } }) {
  globalThis.server.use(
    rest.get(createUrlRegex({ subdomains: ['assets'] }), (req, res, ctx) => {
      const asset = assets[req.url.pathname]

      return asset !== undefined
        ? res(
            ctx.set(
              'x-goog-stored-content-length',
              asset.contentLength.toString(),
            ),
          )
        : res(ctx.status(404))
    }),
  )
}

function expectAsset({
  response,
  expectedStoredContentLength,
}: {
  response: Response
  expectedStoredContentLength: number
}) {
  expect(response.status).toBe(200)
  expect(response.headers.get('x-goog-stored-content-length')).toBe(
    expectedStoredContentLength.toString(),
  )
}
