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
        url: `${legalRepo}/28aaa08d291a85bad79511eb03289ee8146bf25c/en/imprint.md`
      },
      terms: {
        url: `${legalRepo}/28aaa08d291a85bad79511eb03289ee8146bf25c/en/terms.md`
      }
    },
    revised: {
      privacy: [
        {
          revision: new Date('2020-03-16'),
          url: `${legalRepo}/28aaa08d291a85bad79511eb03289ee8146bf25c/en/privacy.md`
        }
      ]
    }
  },
  de: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/966b13e04b51a99c5a7cd9aa3a5464ede4b99429/de/imprint.md`
      },
      terms: {
        url: `${legalRepo}/966b13e04b51a99c5a7cd9aa3a5464ede4b99429/de/terms.md`
      }
    },
    revised: {
      privacy: [
        {
          revision: new Date('2020-02-10'),
          url: `${legalRepo}/1adc8fc546c86dde79219768c96a413d4173d3d9/de/privacy.md`
        },
        {
          revision: new Date('2018-12-01'),
          url: `${legalRepo}/b9948435b6a0e08216d8c8eb972ae4b8a4080570/de/privacy.md`
        },
        {
          revision: new Date('2018-10-17'),
          url: `${legalRepo}/0a4225021ca6b3cd1a448cb41c916f258fe980b3/de/privacy.md`
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
