import { CFEnvironment } from './cf-environment'
import { Instance, createJsonResponse, Url } from './utils'

export function auth(request: Request, env: CFEnvironment): Response | null {
  return authFrontendSectorIdentifierUriValidation(request, env)
}

// TODO: remove if it's not used anymore
function authFrontendSectorIdentifierUriValidation(
  request: Request,
  env: CFEnvironment,
): Response | null {
  const url = Url.fromRequest(request)
  if (
    url.subdomain !== '' ||
    url.pathname !== '/auth/frontend-redirect-uris.json'
  ) {
    return null
  }
  const redirectUris = [
    ...Object.values(Instance).map((instance) => {
      return `https://${instance}.${env.DOMAIN}/api/auth/callback`
    }),
    ...Object.values(Instance).map((instance) => {
      return `https://${instance}.${env.DOMAIN}/api/auth/callback/hydra`
    }),
    ...(env.ALLOW_AUTH_FROM_LOCALHOST === 'true'
      ? [
          'http://localhost:3000/api/auth/callback',
          'http://localhost:3000/api/auth/callback/hydra',
        ]
      : []),
  ]

  return createJsonResponse(redirectUris)
}
