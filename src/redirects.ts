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
import {
  createNotFoundResponse,
  getPathInfo,
  Instance,
  isInstance,
  Url,
} from './utils'

const meetRedirects: Record<string, string | undefined> = {
  '/': 'vtk-ncrc-rdp',
  '/dev': 'rci-pize-jow',
  '/einbindung': 'qzv-ojgk-xqw',
  '/begleitung': 'kon-wdmt-yhb',
  '/reviewing': 'kon-wdmt-yhb',
  '/labschool': 'cvd-pame-zod',
  '/lenabi': 'hfe-apbh-apq',
  '/fundraising': 'uus-vjgu-ttr',
  '/maxsimon': 'jbx-bjba-qjh',
  '/hochschulmathe': 'oud-dpuy-swx',
  '/lamatreffen': 'unm-jesz-ibj',
  '/plenum': 'unm-jesz-ibj',
  '/1': 'fxn-iprp-ezx',
  '/2': 'yku-aksd-fkk',
  '/3': 'qma-zouf-vcz',
  '/4': 'ynr-brkr-vds',
  '/5': 'xqt-cdpm-nco',
  '/6': 'sui-yuwv-suh',
}

export async function redirects(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain === 'start') {
    return Response.redirect(
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301
    )
  }

  if (url.subdomain === Instance.De) {
    switch (url.pathname) {
      case '/datenschutz':
        return Response.redirect('https://de.serlo.org/privacy', 301)
      case '/impressum':
        return Response.redirect('https://de.serlo.org/imprint', 301)
      case '/nutzungsbedingungen':
        return Response.redirect('https://de.serlo.org/terms', 301)
    }
  }

  if (url.subdomain === 'meet') {
    const meetRedirect = meetRedirects[url.pathname]
    return meetRedirect == null
      ? createNotFoundResponse()
      : Response.redirect(`https://meet.google.com/${meetRedirect}`)
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
    url.pathnameWithoutTrailingSlash === '/neuerechtsform'
  ) {
    return Response.redirect(
      'https://drive.google.com/file/d/1G3w2EIXlqvwuZ8LMzsYUjoMf9NbXoDIX/view',
      302
    )
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

  if (isInstance(url.subdomain) && url.pathname === '/user/public') {
    url.pathname = '/user/me'
    return url.toRedirect()
  }

  if (url.subdomain === 'www' || url.subdomain === '') {
    if (url.pathname === '/global') {
      url.subdomain = Instance.En
      return url.toRedirect(301)
    }

    url.subdomain = Instance.De
    return url.toRedirect()
  }

  if (isInstance(url.subdomain)) {
    const regexes = [
      // See https://github.com/serlo/serlo.org-cloudflare-worker/issues/184
      // Can be deleted after a while after the /entity/view/<id>/toc route
      // got deleted
      /^\/entity\/view\/(\d+)\/toc$/,
      /^\/page\/view\/(\d+)$/,
      /^\/ref\/(\d+)$/,
    ]

    for (const regex of regexes) {
      const match = regex.exec(url.pathname)

      if (match) {
        url.pathname = `/${match[1]}`

        return url.toRedirect(301)
      }
    }
  }

  if (isInstance(url.subdomain)) {
    // support for legacy links to comment that are still used in mails
    // `/discussion/{id}`
    // can be deleted after we move the mailings
    const match = /^\/discussion\/(\d+)$/.exec(url.pathname)
    if (match) {
      url.pathname = `/${match[1]}`
      return url.toRedirect(301)
    }
  }

  if (
    isInstance(url.subdomain) &&
    request.headers.get('X-Requested-With') !== 'XMLHttpRequest'
  ) {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname)

    if (pathInfo !== null) {
      const newUrl = new Url(url.href)
      const { currentPath, instance, hash } = pathInfo

      if (instance && url.subdomain !== instance) newUrl.subdomain = instance
      if (url.pathname !== currentPath) newUrl.pathname = currentPath
      if (hash !== undefined) newUrl.hash = hash

      if (newUrl.href !== url.href) return newUrl.toRedirect(301)
    }
  }
}
