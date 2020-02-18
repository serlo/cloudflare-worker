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
import { LanguageCode } from '../utils'
import * as StaticPage from './static-page'

const legalRepo = 'https://raw.githubusercontent.com/serlo/serlo.org-legal'

export const config: StaticPagesConfig = {
  en: {
    staticPages: {
      imprint: {
        title: 'Imprint',
        url: `${legalRepo}/master/en/imprint.md`
      }
    }
  },
  de: {
    staticPages: {
      imprint: {
        title: 'Impressum',
        url: `${legalRepo}/master/de/imprint.md`
      }
    }
  }
}

export interface StaticPageConfig {
  title: string
  url: string
}

export type StaticPagesConfig = {
  readonly [K1 in LanguageCode]?: {
    readonly staticPages: {
      readonly [K2 in StaticPage.Type]?: StaticPageConfig
    }
  }
}
