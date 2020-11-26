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
import URL from 'core-js-pure/features/url'

const UrlProperties = ['subdomain', 'hostname', 'pathname'] as const
type UrlProperties = typeof UrlProperties[number]

const contentApiParameters = [
  'contentOnly',
  'hideTopbar',
  'hideLeftSidebar',
  'hideRightSidebar',
  'hideBreadcrumbs',
  'hideDiscussions',
  'hideBanner',
  'hideHorizon',
  'hideFooter',
  'fullWidth',
]

export class Url extends URL {
  get subdomain(): string {
    return this.hostname.split('.').slice(0, -2).join('.')
  }

  get domain(): string {
    return this.hostname.split('.').slice(-2).join('.')
  }

  set subdomain(subdomain: string) {
    this.hostname = subdomain + (subdomain.length > 0 ? '.' : '') + this.domain
  }

  get pathnameWithoutTrailingSlash(): string {
    return this.pathname.endsWith('/')
      ? this.pathname.slice(0, -1)
      : this.pathname
  }

  change(changes: { [K in UrlProperties]?: string }): Url {
    for (const prop of UrlProperties) {
      const value = changes[prop]

      if (value !== undefined) this[prop] = value
    }

    return this
  }

  hasContentApiParameters() {
    return this.search
      .slice(1)
      .split('&')
      .map((parameterWithValue) => parameterWithValue.split('=')[0])
      .some((queryParameter) => contentApiParameters.includes(queryParameter))
  }

  static fromRequest(request: Request): Url {
    return new Url(request.url)
  }

  toRedirect(status?: number) {
    return Response.redirect(this.toString(), status)
  }
}
