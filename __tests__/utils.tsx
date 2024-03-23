import { givenUuid, getDefaultCFEnvironment } from './__utils__'
import { CFEnvironment } from '../src/cf-environment'
import { getPathInfo, Instance, toCacheKey } from '../src/utils'

describe('getPathInfo()', () => {
  let cfEnv: CFEnvironment

  beforeEach(() => {
    cfEnv = getDefaultCFEnvironment()
  })

  describe('uses PATH_INFO_KV as a cache', () => {
    test('saves values in cache for 1 hour', async () => {
      givenUuid({
        __typename: 'Article',
        alias: '/current-path',
        id: 42,
      })

      await getPathInfo(Instance.En, '/42', cfEnv)

      expect(await cfEnv.PATH_INFO_KV.get(await toCacheKey('/en/42'))).toEqual(
        JSON.stringify({ typename: 'Article', currentPath: '/current-path' }),
      )
    })
  })
})
