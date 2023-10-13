import { CFEnvironment } from './cf-environment'
import { Instance, createJsonResponse, Url } from './utils'

export function auth(request: Request, env: CFEnvironment): Response | null {
  return (
    authFrontendSectorIdentifierUriValidation(request, env) ||
    authKratosIdentitySchema(request)
  )
}

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

function authKratosIdentitySchema(request: Request): Response | null {
  const url = Url.fromRequest(request)
  if (
    url.subdomain !== '' ||
    url.pathname !== '/auth/kratos-identity.schema.json'
  ) {
    return null
  }
  const schema = {
    $id: 'https://serlo.org/auth/kratos-identity.schema.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'User',
    type: 'object',
    properties: {
      traits: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            'ory.sh/kratos': {
              credentials: { password: { identifier: true } },
              verification: { via: 'email' },
              recovery: { via: 'email' },
            },
          },
          username: {
            type: 'string',
            'ory.sh/kratos': {
              credentials: { password: { identifier: true } },
            },
            pattern: '^[\\w\\-]+$',
            // TODO: check if minimal username length should be reintroduced or delete it
            // minLength: 2,
            maxLength: 32,
          },
          description: {
            type: 'string',
          },
          motivation: {
            type: 'string',
          },
          profile_image: {
            type: 'string',
          },
          language: {
            type: 'string',
          },
          interest: {
            type: 'string',
            // empty string is needed to support users that registered before it was made required
            enum: ['parent', 'teacher', 'pupil', 'student', 'other', ''],
          },
        },
        required: ['email', 'username', 'interest'],
        additionalProperties: false,
      },
    },
  }

  return createJsonResponse(schema)
}

