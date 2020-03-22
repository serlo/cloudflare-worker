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

export enum UnrevisedType {
  Imprint = 'imprint',
  Terms = 'terms'
}

export enum RevisedType {
  Privacy = 'privacy'
}

const legalRepo =
  'https://raw.githubusercontent.com/serlo/serlo.org-legal/master'

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
        url: `${legalRepo}/en/imprint.md`
      },
      terms: {
        url: `${legalRepo}/en/terms.md`
      }
    },
    revised: {
      privacy: [
        {
          revision: '2020-03-16',
          url: `${legalRepo}/en/privacy/current.md`
        }
      ]
    }
  },
  de: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/de/imprint.md`
      },
      terms: {
        url: `${legalRepo}/de/terms.md`
      }
    },
    revised: {
      privacy: [
        {
          revision: '2020-02-10',
          url: `${legalRepo}/de/privacy/current.md`
        },
        {
          revision: '2018-12-01',
          url: `${legalRepo}/de/privacy/2018-12-01.md`
        },
        {
          revision: '2018-10-17',
          url: `${legalRepo}/de/privacy/2018-10-17.md`
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
  revision: string
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
    Object.values(LanguageCode).map(lang => [lang, config[lang]?.unrevised])
  )
}

function toRevisedConfig(config: BaseConfig): RevisedConfig {
  return Object.fromEntries(
    Object.values(LanguageCode).map(lang => [lang, config[lang]?.revised])
  )
}
