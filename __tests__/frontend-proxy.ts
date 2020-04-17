import { handleRequest } from '../src/frontend-proxy'

describe('handleRequest()', () => {
  describe('returns null if language tenant is not "de"', () => {
    test.each([
      'https://serlo.org/',
      'http://ta.serlo.org/',
      'https://stats.serlo.org/',
      'http://en.serlo.org/math',
    ])('URL is %p', async (url) => {
      expect(await handleRequest(new Request(url))).toBeNull()
    })
  })
})
