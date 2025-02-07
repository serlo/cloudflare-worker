import * as t from 'io-ts'

import { Instance, Url, CFEnvironment } from './utils'

export function auth(
  request: Request,
  env: CFEnvironment,
): Promise<Response | null> | (Response | null) {
  return (
    authFrontendSectorIdentifierUriValidation(request, env) ||
    hackyVidisAdditionalQueryParam(request)
  )
}

// Remove when Kratos supports additional custom upstream parameters
// See https://github.com/ory/kratos/issues/4293
async function hackyVidisAdditionalQueryParam(
  request: Request,
): Promise<Response | null> {
  const url = Url.fromRequest(request)
  if (url.subdomain !== '' || url.pathname !== '/api/.ory/self-service/login') {
    return null
  }
  const response = await fetch(url.href, request)
  const body = await response.json()

  if (
    response.status === 422 &&
    t.type({ redirect_browser_to: t.string }).is(body)
  ) {
    return new Response(
      JSON.stringify({
        ...body,
        redirect_browser_to:
          body.redirect_browser_to + '&vidis_idp_hint=Landessystem',
      }),
      response,
    )
  }
  return null
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

  return Response.json(redirectUris)
}
