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
import {
  rest,
  ResponseResolver,
  restContext,
  MockedRequest,
  RequestParams,
} from 'msw'
import { DefaultRequestBodyType } from 'msw/lib/types/utils/handlers/requestHandler'

import { domains } from '../test-environment'

export type RestResolver<
  RequestBodyType = DefaultRequestBodyType,
  RequestParamsType = RequestParams
> = ResponseResolver<
  MockedRequest<RequestBodyType, RequestParamsType>,
  typeof restContext
>

export function mockHttpGet(url: string, resolver: RestResolver) {
  global.server.use(
    rest.get(url, (req, res, ctx) => {
      if (req.url.toString() !== url)
        return res(ctx.status(400, 'Bad Request: Query string does not match'))

      return resolver(req, res, ctx)
    })
  )
}

export function returnsText(body: string): RestResolver {
  return (_req, res, ctx) => res.once(ctx.body(body))
}

export function returnsMalformedJson(): RestResolver {
  return (_req, res, ctx) => res(ctx.body('malformed json'))
}

export function returnsJson(data: unknown): RestResolver {
  return (_req, res, ctx) => res(ctx.json(data as any))
}

export function hasInternalServerError(): RestResolver {
  return (_req, res, ctx) => res(ctx.status(500))
}

export function createUrlRegex({
  subdomains,
  pathname = /\/.*/,
}: {
  subdomains: string[]
  pathname?: RegExp | string
}): RegExp {
  return new RegExp(
    'https:\\/\\/' +
      matchStrings(subdomains) +
      '\\.' +
      matchStrings(Object.values(domains)) +
      (typeof pathname === 'string' ? escapeRegex(pathname) : pathname.source)
  )
}

function matchStrings(strings: string[]) {
  return '(' + strings.map(escapeRegex).join('|') + ')'
}

function escapeRegex(text: string): string {
  // https://stackoverflow.com/a/3561711
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}
