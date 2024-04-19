import {
  expectToBeRedirectTo,
  currentTestEnvironment,
  currentTestEnvironmentWhen,
} from './__utils__'

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

test('redirects to default exams landing page when unsupported region is defined', async () => {
  const response = await env.fetch(
    {
      subdomain: 'de',
      pathname: '/mathe-pruefungen',
    },
    { cf: { regionCode: 'TX' } },
  )

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

test('redirects to exams landing page when old alias target is called', async () => {
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/83249/mathematik-prüfungen',
  })

  const target = env.createUrl({
    subdomain: 'de',
    pathname: '/mathe-pruefungen',
  })

  expectToBeRedirectTo(response, target, 302)
})
