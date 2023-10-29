import type { CacheKey } from './utils'

export interface CFEnvironment extends CFVariables {
  // secrets
  API_SECRET: string
  SENTRY_DSN: string

  // KVs
  PATH_INFO_KV: KVNamespace<CacheKey>
}

export interface CFVariables {
  ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
  API_ENDPOINT: string
  DOMAIN: string
  ENVIRONMENT: 'staging' | 'production' | 'local'
  ENABLE_BASIC_AUTH: 'true' | 'false'
  FRONTEND_DOMAIN: string
}
