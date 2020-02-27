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
import { LanguageCode, ALL_LANGUAGE_CODES } from '../utils'
import {
  RevisedConfig,
  UnrevisedConfig,
  UnrevisedType,
  RevisedType,
  SpecBase,
  Revised
} from './'

const legalRepo = 'https://raw.githubusercontent.com/serlo/serlo.org-legal'

const config: BaseConfig = {
  en: {
    unrevised: {
      imprint: {
        title: 'Imprint',
        url: `${legalRepo}/master/en/imprint.md`
      }
    },
    revised: {}
  },
  de: {
    unrevised: {
      imprint: {
        title: 'Impressum',
        url: `${legalRepo}/master/de/imprint.md`
      }
    },
    revised: {}
  }
}

export const unrevisedConfig = toUnrevisedConfig(config)
export const revisedConfig = toRevisedConfig(config)

type BaseConfig = {
  readonly [K1 in LanguageCode]?: {
    readonly unrevised: {
      readonly [K2 in UnrevisedType]?: SpecBase
    }
    readonly revised: {
      readonly [K3 in RevisedType]?: Revised<SpecBase>[]
    }
  }
}

function toUnrevisedConfig(config: BaseConfig): UnrevisedConfig {
  return Object.fromEntries(
    ALL_LANGUAGE_CODES.map(lang => [lang, config[lang]?.unrevised])
  )
}

function toRevisedConfig(config: BaseConfig): RevisedConfig {
  return Object.fromEntries(
    ALL_LANGUAGE_CODES.map(lang => [lang, config[lang]?.revised])
  )
}
