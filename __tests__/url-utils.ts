import { getSubdomain } from '../src/url-utils'

describe('getSubdomain', () => {
  test('https://de.serlo.org', () => {
    expect(getSubdomain('https://de.serlo.local')).toEqual('de')
  })

  test('https://serlo.org', () => {
    expect(getSubdomain('https://serlo.local')).toEqual(null)
  })
})
