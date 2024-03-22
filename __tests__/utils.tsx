import {
  givenApi,
  givenUuid,
  hasInternalServerError,
  returnsJson,
  getDefaultCFEnvironment,
} from './__utils__'
import { CFEnvironment } from '../src/cf-environment'
import { getPathInfo, Instance, toCacheKey } from '../src/utils'

describe('getPathInfo()', () => {
  let cfEnv: CFEnvironment

  beforeEach(() => {
    cfEnv = getDefaultCFEnvironment()
  })

  describe('returns null', () => {
    test('when there was an error with the api call', async () => {
      givenApi(hasInternalServerError())

      expect(await getPathInfo(Instance.En, '/path', cfEnv)).toBeNull()
    })

    describe('when the response is not valid', () => {
      test.each([null, {}, { data: { uuid: {} } }])(
        'response = %p',
        async (invalidResponse) => {
          givenApi(returnsJson(invalidResponse))

          expect(await getPathInfo(Instance.En, '/path', cfEnv)).toBeNull()
        },
      )
    })
  })

  describe('uses PATH_INFO_KV as a cache', () => {
    test('use value in cache', async () => {
      const cacheValue = { typename: 'Article', currentPath: '/current-path' }
      await cfEnv.PATH_INFO_KV.put(
        await toCacheKey('/en/path'),
        JSON.stringify(cacheValue),
      )

      const pathInfo = await getPathInfo(Instance.En, '/path', cfEnv)

      expect(pathInfo).toEqual({
        typename: 'Article',
        currentPath: '/current-path',
      })
    })

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

    test('cache key has maximum width of 512 characters by sha-1 hashing longer keys', async () => {
      const longTamilPath =
        '/%E0%AE%87%E0%AE%B2%E0%AE%95%E0%AF%8D%E0%AE%95%E0%AE%A3%E0' +
        '%AE%AE%E0%AF%8D/%E0%AE%85%E0%AE%9F%E0%AE%BF%E0%AE%AA%E0%AF%8D%E0' +
        '%AE%AA%E0%AE%9F%E0%AF%88-%E0%AE%87%E0%AE%B2%E0%AE%95%E0%AF%8D%E0' +
        '%AE%95%E0%AE%A3%E0%AE%AE%E0%AF%8D/%E0%AE%AE%E0%AF%8A%E0%AE%B4%E0' +
        '%AE%BF%E0%AE%AF%E0%AE%BF%E0%AE%A9%E0%AF%8D-%E0%AE%9A%E0%AF%8A%E0' +
        '%AE%B1%E0%AF%8D%E0%AE%AA%E0%AE%BE%E0%AE%95%E0%AF%81%E0%AE%AA%E0' +
        '%AE%BE%E0%AE%9F%E0%AF%81-%E0%AE%87%E0%AE%B2%E0%AE%95%E0%AF%8D%E0' +
        '%AE%95%E0%AE%BF%E0%AE%AF-%E0%AE%B5%E0%AE%95%E0%AF%88%E0%AE%95%E0' +
        '%AE%B3%E0%AF%8D'
      givenUuid({
        __typename: 'Article',
        alias: decodeURIComponent(longTamilPath),
        instance: Instance.Ta,
      })

      const pathInfo = await getPathInfo(Instance.Ta, longTamilPath, cfEnv)

      expect(pathInfo).toEqual({
        typename: 'Article',
        currentPath: longTamilPath,
        instance: Instance.Ta,
      })
    })

    describe('ignores malformed cache values', () => {
      const target = { typename: 'Article', currentPath: '/current-path' }

      beforeEach(() => {
        givenUuid({
          __typename: 'Article',
          alias: '/current-path',
          id: 42,
        })
      })

      test('when cached value is malformed JSON', async () => {
        await cfEnv.PATH_INFO_KV.put(
          await toCacheKey('/en/42'),
          'malformed json',
        )

        const pathInfo = await getPathInfo(Instance.En, '/42', cfEnv)

        expect(pathInfo).toEqual(target)
        expect(
          await cfEnv.PATH_INFO_KV.get(await toCacheKey('/en/42')),
        ).toEqual(JSON.stringify(target))
      })

      test('when cached value is no PathInfo', async () => {
        const malformedPathInfo = JSON.stringify({ typename: 'Course' })
        await cfEnv.PATH_INFO_KV.put(
          await toCacheKey('/en/42'),
          malformedPathInfo,
        )

        const pathInfo = await getPathInfo(
          Instance.En,
          await toCacheKey('/42'),
          cfEnv,
        )

        expect(pathInfo).toEqual(target)
        expect(
          await cfEnv.PATH_INFO_KV.get(await toCacheKey('/en/42')),
        ).toEqual(JSON.stringify(target))
      })
    })
  })
})
