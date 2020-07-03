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

export function getPathname(url: string): string {
  return new URL(url).pathname
}

export function getQueryString(url: string): string {
  return new URL(url).search
}

export function getPathnameWithoutTrailingSlash(url: string): string {
  const pathname = getPathname(url)

  return pathname.endsWith('/')
    ? pathname.substr(0, pathname.length - 1)
    : pathname
}

export function getSubdomain(url: string): string | null {
  const hostnameParts = new URL(url).hostname.split('.')

  return hostnameParts.length <= 2
    ? null
    : hostnameParts.splice(0, hostnameParts.length - 2).join('.')
}

export function hasContentApiParameters(url: string) {
  return new URL(url).search
    .slice(1)
    .split('&')
    .map((parameterWithValue) => parameterWithValue.split('=')[0])
    .some((queryParameter) => contentApiParameters.includes(queryParameter))
}
