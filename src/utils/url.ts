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
import URL from 'core-js-pure/features/url'

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

const pathsFrontendSupportsWithoutUuids = [
  /^\/$/,
  /^\/search$/,
  /^\/spenden$/,
  /^\/subscriptions\/manage$/,
  /^\/license\/detail\/\d+$/,
  /^\/entity\/repository\/history\/\d+$/,
  /^\/entity\/unrevised$/,
  /^\/event\/history\/user\/\d+\/.+$/,
  /^\/event\/history(\/\d+)?$/,
]

export class Url extends URL {
  public get subdomain(): string {
    return this.hostname.split('.').slice(0, -2).join('.')
  }

  public get domain(): string {
    return this.hostname.split('.').slice(-2).join('.')
  }

  public set subdomain(subdomain: string) {
    this.hostname = subdomain + (subdomain.length > 0 ? '.' : '') + this.domain
  }

  public get pathnameWithoutTrailingSlash(): string {
    return this.pathname.endsWith('/')
      ? this.pathname.slice(0, -1)
      : this.pathname
  }

  public hasContentApiParameters() {
    return this.search
      .slice(1)
      .split('&')
      .map((parameterWithValue) => parameterWithValue.split('=')[0])
      .some((queryParameter) => contentApiParameters.includes(queryParameter))
  }

  public isProbablyUuid(): boolean {
    // TODO: Only after we have deleted the old alias system we know for sure
    // which paths resolve to an uuid. So far we can do the following:
    return this.isFrontendSupportedAndProbablyUuid()
  }

  public isFrontendSupportedAndProbablyUuid(): boolean {
    return pathsFrontendSupportsWithoutUuids.every(
      (regex) => regex.exec(this.pathname) === null
    )
  }

  public toRedirect(status?: number) {
    return Response.redirect(this.toString(), status)
  }

  public static fromRequest(request: Request): Url {
    return new Url(request.url)
  }
}
