import { getPathnameWithoutTrailingSlash, getSubdomain } from '../url-utils'
import { Instance, createJsonResponse } from '../utils'

export function authFrontendSectorIdentifierUriValidation(
  request: Request
): Response | null {
  const { url } = request
  if (
    getSubdomain(url) !== null ||
    getPathnameWithoutTrailingSlash(url) !== '/auth/frontend-redirect-uris.json'
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
