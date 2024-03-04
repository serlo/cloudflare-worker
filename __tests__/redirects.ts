import {
  expectToBeRedirectTo,
  givenApi,
  givenUuid,
  returnsMalformedJson,
  expectContainsText,
  currentTestEnvironment,
  localTestEnvironment,
  currentTestEnvironmentWhen,
} from './__utils__'
import { Instance } from '../src/utils'

const env = currentTestEnvironment()

describe('meet.serlo.org', () => {
  test('meet.serlo.org redirects to meet.google.com/vtk-ncrc-rdp', async () => {
    const response = await env.fetch({ subdomain: 'meet' })

    const target = `https://meet.google.com/vtk-ncrc-rdp`
    expectToBeRedirectTo(response, target, 302)
  })

  test('meet.serlo.org/ansprache redirects to meet.google.com/pwr-bbca-hru', async () => {
    const response = await env.fetch({
      subdomain: 'meet',
      pathname: '/ansprache',
    })

    const target = `https://meet.google.com/pwr-bbca-hru`
    expectToBeRedirectTo(response, target, 302)
  })

  test('returns 404 when meet room is not defined', async () => {
    const response = await env.fetch({
      subdomain: 'meet',
      pathname: '/foo',
    })

    const target = `https://serlo.org/___cf_not_found`
    expectToBeRedirectTo(response, target, 302)
  })
})

test('de.serlo.org/datenschutz', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/datenschutz',
  })

  const target = 'https://de.serlo.org/privacy'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/impressum', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/impressum',
  })

  const target = 'https://de.serlo.org/legal'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/impressum', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/imprint',
  })

  const target = 'https://de.serlo.org/legal'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/nutzungsbedingungen ', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/nutzungsbedingungen',
  })

  const target = 'https://de.serlo.org/terms'
  expectToBeRedirectTo(response, target, 301)
})

test('serlo.org/global -> en.serlo.org/global', async () => {
  const response = await env.fetch({ pathname: '/global' })

  const target = env.createUrl({ subdomain: 'en', pathname: '/global' })
  expectToBeRedirectTo(response, target, 301)
})

test('*.serlo.org/user/public -> *serlo.org/user/me', async () => {
  const response = await env.fetch({
    subdomain: 'hi',
    pathname: '/user/public',
  })

  const target = env.createUrl({ subdomain: 'hi', pathname: '/user/me' })
  expectToBeRedirectTo(response, target, 301)
})

test.each(['/neuerechtsform', '/neuerechtsform/'])(
  'de.serlo.org%s',
  async () => {
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/neuerechtsform',
    })

    const target =
      'https://drive.google.com/file/d/1G3w2EIXlqvwuZ8LMzsYUjoMf9NbXoDIX/view'
    expectToBeRedirectTo(response, target, 302)
  },
)

test('start.serlo.org', async () => {
  const response = await env.fetch({ subdomain: 'start' })

  const target =
    'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/'
  expectToBeRedirectTo(response, target, 301)
})

test('/entity/view/<id>/toc gets redirected to /<id>', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/entity/view/58362/toc',
  })

  expectToBeRedirectTo(
    response,
    env.createUrl({ subdomain: 'de', pathname: '/58362' }),
    301,
  )
})

const labschoolTarget = env.createUrl({
  subdomain: 'de',
  pathname: '/75578/serlo-in-der-schule',
})

test.each(['/labschool', '/labschool/'])(
  'de.serlo.org%s redirects to meta page',
  async (pathname) => {
    const response = await env.fetch({ subdomain: 'de', pathname })

    expectToBeRedirectTo(response, labschoolTarget, 301)
  },
)

test('labschool.serlo.org', async () => {
  const response = await env.fetch({ subdomain: 'labschool' })

  expectToBeRedirectTo(response, labschoolTarget, 301)
})

test.each(['/hochschule', '/hochschule/'])(
  'de.serlo.org%s redirects to taxonomy term of higher education',
  async (pathname) => {
    const response = await env.fetch({ subdomain: 'de', pathname })

    const target = env.createUrl({
      subdomain: 'de',
      pathname: '/mathe/universitaet/44323',
    })
    expectToBeRedirectTo(response, target, 301)
  },
)

test.each(['/beitreten', '/beitreten/'])(
  'de.serlo.org%s redirects to form for joining Serlo Education e.V.',
  async (pathname) => {
    const response = await env.fetch({ subdomain: 'de', pathname })

    const target =
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform'
    expectToBeRedirectTo(response, target, 301)
  },
)

test('serlo.org/* redirects to de.serlo.org/*', async () => {
  const response = await env.fetch({ pathname: '/foo' })

  const target = env.createUrl({ subdomain: 'de', pathname: '/foo' })
  expectToBeRedirectTo(response, target, 301)
})

test('www.serlo.org/* redirects to de.serlo.org/*', async () => {
  const response = await env.fetch({
    subdomain: 'www',
    pathname: '/foo',
  })

  const target = env.createUrl({ subdomain: 'de', pathname: '/foo' })
  expectToBeRedirectTo(response, target, 301)
})

test('/page/view/:id redirects to /:id', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/page/view/1',
  })

  const target = env.createUrl({ subdomain: 'de', pathname: '/1' })
  expectToBeRedirectTo(response, target, 301)
})

test('/ref/:id redirects to /:id', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/ref/1',
  })

  const target = env.createUrl({ subdomain: 'de', pathname: '/1' })
  expectToBeRedirectTo(response, target, 301)
})

describe('LENABI redirect links', () => {
  test('serlo.org/ecec', async () => {
    const response = await currentTestEnvironmentWhen((config) =>
      ['production', 'local'].includes(config.ENVIRONMENT),
    ).fetch({ subdomain: 'de', pathname: '/ecec' })

    expect(response.status).toBe(302)
  })

  test.each([
    '/metadata-api',
    '/data-wallet',
    '/docs',
    '/sso',
    '/status',
    '/user-journey',
    '/docs/sso',
  ])('%s', async (pathname) => {
    const response = await currentTestEnvironmentWhen((config) =>
      ['production', 'local'].includes(config.ENVIRONMENT),
    ).fetch({
      subdomain: 'lenabi',
      pathname,
    })

    expect(response.status).toBe(302)
  })
})

describe('redirects to current path of an resource', () => {
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
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/sexed',
    })

    const target = env.createUrl({
      subdomain: 'en',
      pathname: '/78337/sex-education',
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('redirects when current instance is different than target instance', async () => {
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/78337',
    })

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

  test('redirects to group exercise when a subexercise (i.e. `GroupedExercise`) is requested', async () => {
    givenUuid({
      id: 53209,
      __typename: 'GroupedExercise',
      alias: '/mathe/53209/53209',
      exerciseGroup: {
        alias: '/mathe/53205/53205',
      },
    })

    const response = await env.fetch({ subdomain: 'de', pathname: '/53209' })

    const target = env.createUrl({
      subdomain: 'de',
      pathname: '/mathe/53205/53205',
    })
    expectToBeRedirectTo(response, target, 301)
  })
})

test('redirects to default exams landing page when no region is defined', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/mathe-pruefungen',
  })

  const target = env.createUrl({
    subdomain: 'de',
    pathname: '/mathe-pruefungen/bayern',
  })

  expectToBeRedirectTo(response, target, 302)
})

test('redirects to exams landing page bayern when bayern region is provided', async () => {
  const response = await env.fetch(
    {
      subdomain: 'de',
      pathname: '/mathe-pruefungen',
    },
    { cf: { regionCode: 'BY' } },
  )

  const target = env.createUrl({
    subdomain: 'de',
    pathname: '/mathe-pruefungen/bayern',
  })

  expectToBeRedirectTo(response, target, 302)
})

test('redirects to exams landing page niedersachsen when niedersachsen region is provided', async () => {
  const response = await env.fetch(
    {
      subdomain: 'de',
      pathname: '/mathe-pruefungen',
    },
    { cf: { regionCode: 'NI' } },
  )

  const target = env.createUrl({
    subdomain: 'de',
    pathname: '/mathe-pruefungen/niedersachsen',
  })

  expectToBeRedirectTo(response, target, 302)
})
