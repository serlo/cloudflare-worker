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
export const ALL_REVISED_TYPES = ['privacy'] as const
export type UnrevisedType = typeof ALL_UNREVISED_TYPES[number]
export type RevisedType = typeof ALL_REVISED_TYPES[number]

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
        url: `${legalRepo}/e391a2407e1191fdd371e255fd33324be933b487/en/imprint.md`
      },
      terms: {
        url: `${legalRepo}/e391a2407e1191fdd371e255fd33324be933b487/en/terms.md`
      }
    },
    revised: {
      privacy: [
        {
          revision: new Date('2020-03-16'),
          url: `${legalRepo}/e78d86b9d4a1729de48d87c740c573813038a320/en/privacy.md`
        }
      ]
    }
  },
  de: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/5dd8abbc6f6a0eac1c89c7aad4bd8ec6ce530473/de/imprint.md`
      },
      terms: {
        url: `${legalRepo}/e391a2407e1191fdd371e255fd33324be933b487/de/terms.md`
      }
    },
    revised: {
      privacy: [
        {
          revision: new Date('2020-02-10'),
          url: `${legalRepo}/4c33d7a99b4cf18f300b5204c250f7bfd451ffd8/de/privacy.md`
        },
        {
          revision: new Date('2018-12-01'),
          url: `${legalRepo}/65368036529cd74c2ea177a1d0bbbe73098baab1/de/privacy.md`
        },
        {
          revision: new Date('2018-10-17'),
          url: `${legalRepo}/d9fb1775e1abf52352d1453a0ca54d09d14bdac0/de/privacy.md`
        }
      ]
    }
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
