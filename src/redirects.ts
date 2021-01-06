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

import {
  Url,
  createNotFoundResponse,
  Instance,
  isInstance,
  getPathInfo,
} from './utils'

export async function redirects(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain === 'start') {
    return Response.redirect(
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301
    )
  }

  if (url.subdomain === 'de') {
    switch (url.pathname) {
      case '/datenschutz':
        return Response.redirect('https://de.serlo.org/privacy')
      case '/impressum':
        return Response.redirect('https://de.serlo.org/imprint')
      case '/nutzungsbedingungen':
        return Response.redirect('https://de.serlo.org/terms')
    }
  }

  if (url.subdomain === 'meet') {
    switch (url.pathname) {
      case '/':
        return Response.redirect('https://meet.google.com/vtk-ncrc-rdp')
      case '/dev':
        return Response.redirect('https://meet.google.com/rci-pize-jow')
      case '/einbindung':
        return Response.redirect('https://meet.google.com/qzv-ojgk-xqw')
      case '/begleitung':
        return Response.redirect('https://meet.google.com/kon-wdmt-yhb')
      case '/reviewing':
        return Response.redirect('https://meet.google.com/kon-wdmt-yhb')
      case '/labschool':
        return Response.redirect('https://meet.google.com/cvd-pame-zod')
      case '/1':
        return Response.redirect('https://meet.google.com/fxn-iprp-ezx')
      case '/2':
        return Response.redirect('https://meet.google.com/yku-aksd-fkk')
      case '/3':
        return Response.redirect('https://meet.google.com/qma-zouf-vcz')
      case '/4':
        return Response.redirect('https://meet.google.com/iskddmh-wrh')
      case '/5':
        return Response.redirect('https://meet.google.com/xqt-cdpm-nco')
      case '/6':
        return Response.redirect('https://meet.google.com/sui-yuwv-suh')
      default:
        return createNotFoundResponse()
    }
  }

  if (
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/labschool'
  ) {
    url.subdomain = 'labschool'
    url.pathname = '/'
    return url.toRedirect(301)
  }

  if (
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/hochschule'
  ) {
    url.pathname = '/mathe/universitaet/44323'
    return url.toRedirect(301)
  }

  if (
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/beitreten'
  ) {
    return Response.redirect(
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
      301
    )
  }

  if (url.subdomain === 'www' || url.subdomain === '') {
    url.subdomain = 'de'
    return url.toRedirect()
  }

  if (
    isInstance(url.subdomain) &&
    url.isProbablyUuid() &&
    request.headers.get('X-Requested-With') !== 'XMLHttpRequest'
  ) {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname)

    if (pathInfo !== null) {
      const newUrl = new Url(url.href)
      const { currentPath, instance } = pathInfo

      if (instance && url.subdomain !== instance) newUrl.subdomain = instance
      if (url.pathname !== currentPath) newUrl.pathname = currentPath

      if (newUrl.href !== url.href) return newUrl.toRedirect(301)
    }
  }
}
