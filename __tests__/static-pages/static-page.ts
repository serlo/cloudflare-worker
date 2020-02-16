/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { StaticPagesConfig } from '../../src/static-pages/config'
import * as StaticPage from '../../src/static-pages/static-page'

describe('getSpec()', () => {
  const englishImprint: StaticPage.Spec = {
    title: 'English Imprint',
    url: new URL('http://example.com/imprint')
  }
  const germanImprint: StaticPage.Spec = {
    title: 'German Imprint',
    url: new URL('https://example.org/impressum.md')
  }
  const germanTerms: StaticPage.Spec = {
    title: 'Nutzungsbedingungen',
    url: new URL('ftp://serlo.org/terms')
  }

  const exampleConfig: StaticPagesConfig = {
    en: {
      staticPages: {
        imprint: englishImprint
      }
    },
    de: {
      staticPages: {
        imprint: germanImprint,
        terms: germanTerms
      }
    }
  }

  test('returns Spec when it exists', () => {
    expect(
      StaticPage.getSpec(exampleConfig, 'en', StaticPage.Type.Imprint)
    ).toEqual(englishImprint)

    expect(
      StaticPage.getSpec(exampleConfig, 'de', StaticPage.Type.Imprint)
    ).toEqual(germanImprint)

    expect(
      StaticPage.getSpec(exampleConfig, 'de', StaticPage.Type.TermsOfUse)
    ).toEqual(germanTerms)
  })

  test('returns English version when requested Spec does not exist', () => {
    expect(
      StaticPage.getSpec(exampleConfig, 'fr', StaticPage.Type.Imprint)
    ).toEqual(englishImprint)
  })

  test('returns null when no Spec or English Spec can be found', () => {
    expect(
      StaticPage.getSpec(exampleConfig, 'fr', StaticPage.Type.TermsOfUse)
    ).toBeNull()

    expect(
      StaticPage.getSpec(exampleConfig, 'en', StaticPage.Type.TermsOfUse)
    ).toBeNull()
  })
})
