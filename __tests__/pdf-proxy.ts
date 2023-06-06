import { rest } from 'msw'

import { currentTestEnvironment } from './__utils__'

describe('proxy for pdf.serlo.org', () => {
  beforeEach(() => {
    setupPdfSerloOrg()
  })

  test('request to de.serlo.org/api/pdf/* gets pdf from pdf.serlo.org', async () => {
    const env = currentTestEnvironment()
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/api/pdf/100',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
  })

  function setupPdfSerloOrg() {
    globalThis.server.use(
      rest.get('https://pdf.serlo.org/api/100', (_req, res, ctx) => {
        return res(ctx.set('content-type', 'application/pdf'))
      })
    )
  }
})
