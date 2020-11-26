import { Instance, createJsonResponse, Url } from './utils'

export function authFrontendSectorIdentifierUriValidation(
  request: Request
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
      return `https://${instance}.${global.DOMAIN}/api/auth/callback`
    }),
    ...(global.ALLOW_AUTH_FROM_LOCALHOST === 'true'
      ? ['http://localhost:3000/api/auth/callback']
      : []),
  ]

  return createJsonResponse(redirectUris)
}
