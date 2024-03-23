import {
  expectToBeRedirectTo,
  givenApi,
  givenUuid,
  returnsMalformedJson,
  expectContainsText,
  localTestEnvironment,
  currentTestEnvironment,
  hasInternalServerError,
  returnsJson,
} from './__utils__'
import { Instance } from '../src/utils'

const env = currentTestEnvironment()

beforeEach(() => {
  givenUuid({
    id: 78337,
    __typename: 'Page',
    oldAlias: '/sexed',
    alias: '/78337/sex-education',
    content: 'Sex Education',
    instance: Instance.En,
  })
})

test('redirects when current path is different than target path', async () => {
  const response = await env.fetch({ subdomain: 'en', pathname: '/sexed' })

  const target = env.createUrl({
    subdomain: 'en',
    pathname: '/78337/sex-education',
  })
  expectToBeRedirectTo(response, target, 301)
})

test('redirects when current instance is different than target instance', async () => {
  const response = await env.fetch({ subdomain: 'de', pathname: '/78337' })

  const target = env.createUrl({
    subdomain: 'en',
    pathname: '/78337/sex-education',
  })
  expectToBeRedirectTo(response, target, 301)
})

test('no redirect when current path is the same as given path', async () => {
  const response = await env.fetch({
    subdomain: 'en',
    pathname: '/78337/sex-education',
  })

  await expectContainsText(response, ['Sex Education'])
})

test('no redirect when requested entity has no alias', async () => {
  givenUuid({
    id: 27778,
    __typename: 'Comment',
    content: 'Applets vertauscht?',
  })

  const response = await localTestEnvironment().fetch({
    subdomain: 'de',
    pathname: '/27778',
  })

  await expectContainsText(response, ['Applets vertauscht'])
})

describe('redirects to first course page when requested entity is a course', () => {
  test('when no course page is trashed', async () => {
    givenUuid({
      id: 61682,
      __typename: 'Course',
      alias: 'course-alias',
      pages: [
        { alias: '/mathe/61911/%C3%BCbersicht' },
        { alias: '/mathe/61686/negative-zahlen-im-alltag' },
      ],
    })

    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/61682',
    })

    const target = env.createUrl({
      subdomain: 'de',
      pathname: '/mathe/61911/%C3%BCbersicht',
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('when first course pages are trashed or have no current revision', async () => {
    givenUuid({
      id: 19479,
      __typename: 'Course',
      alias: 'course-alias',
      pages: [{ alias: '/mathe/20368/%C3%BCberblick' }],
    })

    const response = await env.fetch({ subdomain: 'de', pathname: '/19479' })

    const target = env.createUrl({
      subdomain: 'de',
      pathname: '/mathe/20368/%C3%BCberblick',
    })
    expectToBeRedirectTo(response, target, 301)
  })
})

test('redirects to alias of course when list of course pages is empty', async () => {
  const env = localTestEnvironment()

  // TODO: Find an empty course at serlo.org
  givenUuid({
    id: 42,
    __typename: 'Course',
    alias: '/course',
    pages: [],
  })

  const response = await env.fetch({ subdomain: 'en', pathname: '/42' })

  const target = env.createUrl({ subdomain: 'en', pathname: '/course' })
  expectToBeRedirectTo(response, target, 301)
})

describe('no redirect', () => {
  const env = localTestEnvironment()

  beforeEach(() => {
    givenUuid({
      __typename: 'Article',
      alias: '/path',
      content: 'article content',
      instance: Instance.En,
    })
  })

  test('when API has internal server error', async () => {
    givenApi(hasInternalServerError())

    await expectNoRedirect()
  })

  test('when API responds with malformed JSON', async () => {
    givenApi(returnsMalformedJson())

    await expectNoRedirect()
  })

  test('when API responds with illegal JSON', async () => {
    givenApi(returnsJson({ data: { uuid: {} } }))

    await expectNoRedirect()
  })

  async function expectNoRedirect() {
    const response = await env.fetch({ subdomain: 'en', pathname: '/path' })

    await expectContainsText(response, ['article content'])
  }
})

test('handles URL encodings correctly', async () => {
  givenUuid({
    id: 1385,
    __typename: 'TaxonomyTerm',
    alias: '/mathe/1385/zahlen-und-größen',
    instance: Instance.De,
    content: 'Zahlen und Größen',
  })

  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/mathe/1385/zahlen-und-größen',
  })

  await expectContainsText(response, ['Zahlen und Größen'])
})

test('redirects to article when single comment is requested', async () => {
  givenUuid({
    id: 65395,
    __typename: 'Comment',
    trashed: false,
    alias: '/mathe/65395/65395',
    legacyObject: { alias: '/mathe/1573/vektor' },
  })

  const response = await env.fetch({ subdomain: 'de', pathname: '/65395' })

  const target = env.createUrl({
    subdomain: 'de',
    pathname: '/mathe/1573/vektor#comment-65395',
  })
  expectToBeRedirectTo(response, target, 301)
})

test('redirects to article when old comment link is requested', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/discussion/65395',
  })

  const target = env.createUrl({ subdomain: 'de', pathname: '/65395' })

  expectToBeRedirectTo(response, target, 301)
})

test('redirects to error when comment is deleted', async () => {
  givenUuid({
    id: 57989,
    __typename: 'Comment',
    alias: '/mathe/57989/tabellen-der-binomialverteilung',
    trashed: true,
    legacyObject: { alias: '"/mathe/2015/bernoulli-kette' },
  })

  const response = await env.fetch({ subdomain: 'de', pathname: '/57989' })

  const target = env.createUrl({
    subdomain: 'de',
    pathname: '/error/deleted/Comment',
  })
  expectToBeRedirectTo(response, target, 301)
})

describe('cache', () => {
  const env = localTestEnvironment()

  beforeEach(() => {
    givenUuid({ __typename: 'Article', id: 42, alias: '/path' })
  })

  test('uses cache to retrieve current path', async () => {
    const response = await env.fetch({ subdomain: 'de', pathname: '/42' })
    const target = env.createUrl({ subdomain: 'de', pathname: '/path' })
    expectToBeRedirectTo(response, target, 301)

    givenUuid({ __typename: 'Article', id: 42, alias: '/new-path' })

    const secondResponse = await env.fetch({ subdomain: 'de', pathname: '/42' })
    expectToBeRedirectTo(secondResponse, target, 301)
  })

  test('can handle long paths', async () => {
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
      id: 4,
      alias: decodeURIComponent(longTamilPath),
    })

    const response = await env.fetch({ subdomain: 'ta', pathname: '/4' })
    const target = env.createUrl({ subdomain: 'ta', pathname: longTamilPath })
    expectToBeRedirectTo(response, target, 301)
  })
})
