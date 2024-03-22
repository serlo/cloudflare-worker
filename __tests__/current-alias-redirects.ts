import {
  expectToBeRedirectTo,
  givenApi,
  givenUuid,
  returnsMalformedJson,
  expectContainsText,
  localTestEnvironment,
  currentTestEnvironment,
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

test('no redirect when current path cannot be requested', async () => {
  const env = localTestEnvironment()

  givenApi(returnsMalformedJson())
  givenUuid({
    __typename: 'Article',
    alias: '/path',
    content: 'article content',
    instance: Instance.En,
  })

  const response = await env.fetch({ subdomain: 'en', pathname: '/path' })

  await expectContainsText(response, ['article content'])
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
