/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import * as R from 'ramda'

interface UrlSpec {
  protocol?: string
  subdomain?: string
  domain?: string
  pathname?: string
  query?: string
}

const urlRegex = /(?<protocol>https?):\/\/((?<subdomain>[\w.]+)\.)?(?<domain>[\w-]+\.\w+)(?<pathname>\/[^?]*)?(?<query>\?.*)?/

export class Url {
  constructor(private spec: UrlSpec) {}

  get protocol(): string {
    return this.spec.protocol ?? 'https'
  }

  get subdomain(): string {
    return this.spec.subdomain ?? ''
  }

  get domain(): string {
    return this.spec.domain ?? global.DOMAIN
  }

  get pathname(): string {
    return this.spec.pathname ?? '/'
  }

  get pathnameWithoutTrailingSlash(): string {
    return this.pathname.endsWith('/')
      ? this.pathname.substr(0, this.pathname.length - 1)
      : this.pathname
  }

  get query(): string {
    return this.spec.query ?? ''
  }

  change(changes: UrlSpec): Url {
    return new Url(R.mergeRight(this.spec, changes))
  }

  changeHostname(hostname: string): Url {
    const parts = hostname.split('.')

    return this.change({
      subdomain: parts.slice(0, -2).join('.'),
      domain: parts.slice(-2).join('.'),
    })
  }

  static fromString(url: string): Url {
    const match = urlRegex.exec(url)

    if (match) {
      return new Url(
        R.pick(
          ['protocol', 'subdomain', 'domain', 'pathname', 'query'],
          match.groups ?? {}
        )
      )
    } else {
      // TODO: Report sentry error
      return new Url({})
    }
  }

  static fromRequest(request: Request): Url {
    return Url.fromString(request.url)
  }

  toString(): string {
    return [
      this.protocol,
      '://',
      this.subdomain,
      this.subdomain !== '' ? '.' : '',
      this.domain,
      this.pathname,
      this.query,
    ].join('')
  }

  toRedirect(status?: number) {
    return Response.redirect(this.toString(), status)
  }
}
