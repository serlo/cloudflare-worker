import type { CacheKey } from './utils'

export interface CFEnvironment {
  // secrets
  API_SECRET: string
  SENTRY_DSN: string

  // Variables
  ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
  API_ENDPOINT: string
  DOMAIN: string
  ENVIRONMENT: 'staging' | 'production' | 'local'
  ENABLE_BASIC_AUTH: 'true' | 'false'
  FRONTEND_DOMAIN: string

  // KVs
  PACKAGES_KV: KVNamespace<string>
  PATH_INFO_KV: KVNamespace<CacheKey>
}
