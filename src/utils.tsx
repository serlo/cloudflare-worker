/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { h } from 'preact'
import sanitize from 'sanitize-html'
import marked from 'marked'
import { VNode } from 'preact'
import renderToString from 'preact-render-to-string'

import { NotFound } from './ui'

export const ALL_LANGUAGE_CODES = ['en', 'de', 'fr', 'ta', 'hi', 'es'] as const
export type LanguageCode = typeof ALL_LANGUAGE_CODES[number]

export function isLanguageCode(code: string): code is LanguageCode {
  return ALL_LANGUAGE_CODES.some(x => x === code)
}

export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags
      .filter(x => x !== 'iframe')
      .concat(['h1', 'h2'])
  }).trim()
}

export function markdownToHtml(markdown: string): string {
  return marked(markdown, { headerIds: false }).trim()
}

export async function fetchWithCache(url: string): Promise<Response> {
  return await fetch(url, ({
    cf: { cacheTtl: 60 * 60 }
  } as unknown) as RequestInit)
}

export class PreactResponse extends Response {
  constructor(component: VNode, opt?: ResponseInit) {
    super(renderToString(component), {
      ...opt,
      headers: {
        ...opt?.headers,
        'Content-Type': 'text/html;charset=utf-8'
      }
    })
  }
}

export class JsonResponse extends Response {
  constructor(json: any) {
    super(JSON.stringify(json), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export class NotFoundResponse extends PreactResponse {
  constructor() {
    super(<NotFound />, { status: 404 })
  }
}
