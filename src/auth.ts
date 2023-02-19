/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021-2022 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Instance, createJsonResponse, Url } from './utils'

export function auth(request: Request): Response | null {
  return (
    authFrontendSectorIdentifierUriValidation(request) ||
    authKratosIdentitySchema(request) ||
    authKratosGithubJsonnet(request) ||
    authKratosAfterRegistrationHookPayloadJsonnet(request)
  )
}

function authFrontendSectorIdentifierUriValidation(
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
    ...Object.values(Instance).map((instance) => {
      return `https://${instance}.${global.DOMAIN}/api/auth/callback/hydra`
    }),
    ...(global.ALLOW_AUTH_FROM_LOCALHOST === 'true'
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

function authKratosAfterRegistrationHookPayloadJsonnet(
  request: Request
): Response | null {
  const url = Url.fromRequest(request)
  if (
    url.subdomain !== '' ||
    url.pathname !== '/auth/after-registration-hook-payload.jsonnet'
  ) {
    return null
  }

  const payload = `
function(ctx) { userId: ctx.identity.id }
  `

  return new Response(payload, {
    headers: { 'Content-Type': 'text/plain' },
  })
}

function authKratosGithubJsonnet(request: Request): Response | null {
  const url = Url.fromRequest(request)
  if (url.subdomain !== '' || url.pathname !== '/auth/kratos-github.jsonnet') {
    return null
  }

  const net = `
local claims = {
  email_verified: false
} + std.extVar('claims');

{
  identity: {
    traits: {
      [if "email" in claims && claims.email_verified then "email" else null]: claims.email,
    },
  },
}
  `

  return new Response(net, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
