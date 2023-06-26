/* eslint-disable no-var */
// Secrets
declare var API_SECRET: string
declare var SENTRY_DSN: string

// Variables
declare var ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
declare var API_ENDPOINT: string
declare var DOMAIN: string
declare var ENVIRONMENT: 'staging' | 'production' | 'local'
declare var ENABLE_BASIC_AUTH: 'true' | 'false'
declare var FRONTEND_DOMAIN: string

// KVs
declare var PACKAGES_KV: KVNamespace<string>
declare var PATH_INFO_KV: KVNamespace<import('./utils').CacheKey>
