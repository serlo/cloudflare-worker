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

export const ALL_UNREVISED_TYPES = ['imprint', 'terms'] as const
export const ALL_REVSIED_TYPES = ['privacy'] as const
export type UnrevisedType = typeof ALL_UNREVISED_TYPES[number]
export type RevisedType = typeof ALL_REVSIED_TYPES[number]

const legalRepo = 'https://raw.githubusercontent.com/serlo/serlo.org-legal'

// TODO: i18n
export const titles: { [K in RevisedType | UnrevisedType]: string } = {
  imprint: 'Imprint',
  terms: 'Terms of Use',
  privacy: 'Privacy'
}

const config: BaseConfig = {
  en: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/master/en/imprint.md`
      }
    },
    revised: {
      privacy: [
        { revision: new Date(2929, 0, 1), url: '1' },
        { revision: new Date(229, 0, 1), url: '1' },
        { revision: new Date(29, 0, 1), url: '1' }
      ]
    }
  },
  de: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/master/de/imprint.md`
      }
    },
    revised: {}
  }
}

export const unrevisedConfig: UnrevisedConfig = toUnrevisedConfig(config)
export const revisedConfig: RevisedConfig = toRevisedConfig(config)

export interface Spec {
  url: string
}

export interface RevisedSpec extends Spec {
  revision: Date
}

export type UnrevisedConfig = Config<UnrevisedType, Spec>
export type RevisedConfig = Config<RevisedType, RevisedSpec[]>

export type Config<A extends string, B> = {
  readonly [K1 in LanguageCode]?: {
    [K2 in A]?: B
  }
}

type BaseConfig = {
  readonly [K1 in LanguageCode]?: {
    readonly unrevised: {
      readonly [K2 in UnrevisedType]?: Spec
    }
    readonly revised: {
      readonly [K3 in RevisedType]?: RevisedSpec[]
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
