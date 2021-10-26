/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Instance, createJsonResponse, Url } from './utils'

export function auth(request: Request): Response | null {
  return (
    authFrontendSectorIdentifierUriValidation(request) ||
    authKratosIdentitySchema(request)
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
    ...(global.ALLOW_AUTH_FROM_LOCALHOST === 'true'
      ? ['http://localhost:3000/api/auth/callback']
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
              credentials: {
                password: {
                  identifier: true,
                },
              },
              verification: {
                via: 'email',
              },
              recovery: {
                via: 'email',
              },
            },
          },
          username: {
            type: 'string',
            'ory.sh/kratos': {
              credentials: {
                password: {
                  identifier: true,
                },
              },
            },
          },
        },
        required: ['email', 'username'],
      },
    },
  }

  return createJsonResponse(schema)
}
