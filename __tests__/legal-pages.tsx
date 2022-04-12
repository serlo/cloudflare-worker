/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2022 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */

import {
  expectIsJsonResponse,
  mockHttpGet,
  returnsText,
  RestResolver,
  hasInternalServerError,
  expectIsNotFoundResponse,
  currentTestEnvironment,
  localTestEnvironment,
} from './__utils__'

let env: ReturnType<typeof currentTestEnvironment>

beforeEach(() => {
  env = currentTestEnvironment()
})

describe('serlo.org/terms', () => {
  test('is in German at de.serlo.org/terms', async () => {
    givenLegalPageWith('de/terms.md', 'Informationen für Weiternutzer')

    const response = await env.fetch({ subdomain: 'de', pathname: '/terms' })

    expect(await response.text()).toEqual(
      expect.stringContaining('Informationen für Weiternutzer')
    )
  })
  test('is in English at en.serlo.org/terms', async () => {
    givenLegalPageWith('en/terms.md', 'Terms of Use')

    const response = await env.fetch({ subdomain: 'en', pathname: '/terms' })

    expect(await response.text()).toEqual(
      expect.stringContaining('Terms of Use')
    )
  })
})

describe('serlo.org/imprint', () => {
  test('is in German at de.serlo.org/imprint', async () => {
    givenLegalPageWith('de/imprint.md', 'Impressum')

    const response = await env.fetch({ subdomain: 'de', pathname: '/imprint' })

    expect(await response.text()).toEqual(expect.stringContaining('Impressum'))
  })

  test('is in English at en.serlo.org/imprint', async () => {
    givenLegalPageWith('en/imprint.md', 'Imprint')

    const response = await env.fetch({ subdomain: 'en', pathname: '/imprint' })

    expect(await response.text()).toEqual(expect.stringContaining('Imprint'))
  })
})

describe('privacy policies', () => {
  describe('serlo.org/privacy', () => {
    test('is in German at de.serlo.org/privacy', async () => {
      givenLegalPageWith('de/privacy/current.md', 'Datenschutzerklärung')

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/privacy',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining('Datenschutzerklärung')
      )
    })

    test('is in English at en.serlo.org/privacy', async () => {
      givenLegalPageWith('en/privacy/current.md', 'Privacy Policy')

      const response = await env.fetch({
        subdomain: 'en',
        pathname: '/privacy',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining('Privacy Policy')
      )
    })

    test('contains a link to revoke consent', async () => {
      givenLegalPageWith('en/privacy/current.md', '')

      const response = await env.fetch({
        subdomain: 'en',
        pathname: '/privacy',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining('You can check and revoke your given consent')
      )
    })

    test('links to the archive of privacy policies', async () => {
      givenLegalPageWith('de/privacy/current.md', '')

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/privacy',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining('<a href="/privacy/archive">Archiv</a>')
      )
    })
  })

  describe('archived version of a privacy policy', () => {
    test('is in German at de.serlo.org/privacy/2020-02-10', async () => {
      givenLegalPageWith('de/privacy/2020-02-10.md', 'Datenschutzerklärung')

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/privacy/archive/2020-02-10',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining('Datenschutzerklärung')
      )
    })

    test('links to the archive and the current version', async () => {
      givenLegalPageWith('de/privacy/2020-02-10.md', '')

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/privacy/archive/2020-02-10',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining(
          'Dies ist eine archivierte Version. Schaue Dir die ' +
            '<a href="/privacy">aktuelle Version</a> oder ' +
            '<a href="/privacy/archive">frühere Versionen</a> an.'
        )
      )
    })

    test('is not the same website as serlo.org/privacy', async () => {
      givenLegalPageWith('de/privacy/2020-02-10.md', '')

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/privacy/archive/2020-02-10',
      })

      expect(await response.text()).toEqual(
        expect.stringContaining('wirksam ab dem 10.2.2020')
      )
    })
  })

  test('supports deactivating of google analytics via JS-GOOGLE-ANALYTICS-DEACTIVATE', async () => {
    givenLegalPageWith(
      'de/privacy/2020-02-10.md',
      '[Google Analytics deaktivieren](JS-GOOGLE-ANALYTICS-DEACTIVATE)'
    )

    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/privacy/archive/2020-02-10',
    })

    expect(await response.text()).toEqual(
      expect.stringContaining(
        '<a href="javascript:gaOptout();">Google Analytics deaktivieren</a>'
      )
    )
  })

  test('serlo.org/privacy/json returns list of privacy versions', async () => {
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/privacy/json',
    })

    await expectIsJsonResponse(response, expect.arrayContaining(['2020-02-10']))
  })
})

describe('English version is the default version', () => {
  test('for fr.serlo.org/terms', async () => {
    givenLegalPageWith('en/terms.md', 'Terms of Use')

    const response = await env.fetch({ subdomain: 'fr', pathname: '/terms' })

    expect(await response.text()).toEqual(
      expect.stringContaining('Terms of Use')
    )
  })

  test('for fr.serlo.org/imprint', async () => {
    givenLegalPageWith('en/imprint.md', 'Imprint')

    const response = await env.fetch({ subdomain: 'fr', pathname: '/imprint' })

    expect(await response.text()).toEqual(expect.stringContaining('Imprint'))
  })

  test('for fr.serlo.org/privacy', async () => {
    givenLegalPageWith('en/privacy/current.md', 'Privacy Policy')

    const response = await env.fetch({ subdomain: 'fr', pathname: '/privacy' })

    expect(await response.text()).toEqual(
      expect.stringContaining('Privacy Policy')
    )
  })
})

describe('trailing slashes are allowed in accessing the legal pages', () => {
  test('for serlo.org/terms/', async () => {
    givenLegalPageWith('en/terms.md', 'Terms of Use')

    const response = await env.fetch({ subdomain: 'en', pathname: '/terms/' })

    expect(await response.text()).toEqual(
      expect.stringContaining('Terms of Use')
    )
  })

  test('for serlo.org/imprint/', async () => {
    givenLegalPageWith('en/imprint.md', 'Imprint')

    const response = await env.fetch({ subdomain: 'en', pathname: '/imprint' })

    expect(await response.text()).toEqual(expect.stringContaining('Imprint'))
  })

  test('for serlo.org/privacy/', async () => {
    givenLegalPageWith('en/privacy/current.md', 'Privacy Policy')

    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/privacy/',
    })

    expect(await response.text()).toEqual(
      expect.stringContaining('Privacy Policy')
    )
  })
})

test('legal pages have a link to revoke consent', async () => {
  givenLegalPageWith('en/imprint.md', 'Imprint')

  const response = await env.fetch({ subdomain: 'en', pathname: '/imprint' })

  expect(await response.text()).toEqual(
    expect.stringContaining('<a href="/consent">Revoke consent</a>')
  )
})

test('returns 404 response when current version of legal page cannot be requested', async () => {
  const env = localTestEnvironment()

  givenLegalPage('en/terms.md', hasInternalServerError())

  const response = await env.fetch({
    subdomain: 'en',
    pathname: '/terms/',
  })

  await expectIsNotFoundResponse(response)
})

describe('html of legal pages is sanitized', () => {
  test.each([
    '<iframe src="malware.com"></iframe>',
    '<script>alert(42)</script>',
  ])('tag type: %s', async (exampleCode) => {
    const env = localTestEnvironment()

    givenLegalPageWith('en/imprint.md', exampleCode)

    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/imprint',
    })

    expect(await response.text()).not.toEqual(
      expect.stringContaining(exampleCode)
    )
  })
})

function givenLegalPageWith(path: string, text: string) {
  givenLegalPage(path, returnsText(text))
}

function givenLegalPage(path: string, resolver: RestResolver) {
  mockHttpGet(
    `https://raw.githubusercontent.com/serlo/serlo.org-legal/main/${path}`,
    resolver
  )
}
