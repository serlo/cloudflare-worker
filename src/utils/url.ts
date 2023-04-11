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
import type { URLSearchParams } from '@cloudflare/workers-types'

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
    // FIXME: Somehow Typescript does not take the URLSearchParams definition
    // of `@cloudflare/worker-types`. This a a shaky workaround to make
    // Typescript happy.
    const params = this.searchParams as URLSearchParams

    return Array.from(params.keys()).some((key) =>
      contentApiParameters.includes(key)
    )
  }

  public toRedirect(status?: number) {
    return Response.redirect(this.toString(), status)
  }

  public static fromRequest(request: Request): Url {
    return new Url(request.url)
  }
}
