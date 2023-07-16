import { Instance } from '../utils'

export enum UnrevisedType {
  Imprint = 'imprint',
  Terms = 'terms',
}

export enum RevisedType {
  Privacy = 'privacy',
}

const legalRepo = 'https://raw.githubusercontent.com/serlo/serlo.org-legal/main'

// TODO: i18n
export const titles: {
  [K in RevisedType | UnrevisedType]: {
    [key in Instance]?: string
  }
} = {
  imprint: {
    de: 'Impressum',
    en: 'Imprint',
  },
  terms: {
    de: 'Nutzungsbedigungen und Urheberrecht',
    en: 'Terms of Use',
  },
  privacy: {
    de: 'Datenschutzerklärung',
    en: 'Privacy Policy',
  },
}

const config: BaseConfig = {
  en: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/en/imprint.md`,
      },
      terms: {
        url: `${legalRepo}/en/terms.md`,
      },
    },
    revised: {
      privacy: [
        {
          revision: '2023-05-17',
          url: `${legalRepo}/en/privacy/current.md`,
        },
        {
          revision: '2020-11-18',
          url: `${legalRepo}/en/privacy/2020-11-18.md`,
        },
        {
          revision: '2020-06-02',
          url: `${legalRepo}/en/privacy/2020-06-02.md`,
        },
        {
          revision: '2020-03-16',
          url: `${legalRepo}/en/privacy/2020-03-16.md`,
        },
      ],
    },
  },
  de: {
    unrevised: {
      imprint: {
        url: `${legalRepo}/de/imprint.md`,
      },
      terms: {
        url: `${legalRepo}/de/terms.md`,
      },
    },
    revised: {
      privacy: [
        {
          revision: '2023-05-17',
          url: `${legalRepo}/de/privacy/current.md`,
        },
        {
          revision: '2020-11-18',
          url: `${legalRepo}/de/privacy/2020-11-18.md`,
        },
        {
          revision: '2020-05-11',
          url: `${legalRepo}/de/privacy/2020-05-11.md`,
        },
        {
          revision: '2020-02-10',
          url: `${legalRepo}/de/privacy/2020-02-10.md`,
        },
        {
          revision: '2018-12-01',
          url: `${legalRepo}/de/privacy/2018-12-01.md`,
        },
        {
          revision: '2018-10-17',
          url: `${legalRepo}/de/privacy/2018-10-17.md`,
        },
      ],
    },
  },
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
  readonly [K1 in Instance]?: {
    [K2 in A]?: B
  }
}

type BaseConfig = {
  readonly [K1 in Instance]?: {
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
    Object.values(Instance).map((lang) => [lang, config[lang]?.unrevised]),
  )
}

function toRevisedConfig(config: BaseConfig): RevisedConfig {
  return Object.fromEntries(
    Object.values(Instance).map((lang) => [lang, config[lang]?.revised]),
  )
}
