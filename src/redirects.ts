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
import { createNotFoundResponse, Url } from './utils'

export async function urlCheck1(
  url: Url,
  subdomainName: string,
  firstLink: string,
  statusNum: number
) {
  if (url.subdomain === subdomainName) {
    return Response.redirect(firstLink, statusNum)
  }
}
export async function urlCheck2(
  url: Url,
  subdomainName: string,
  firstObject: { sign: string; link: string },
  secondObject: { sign: string; link: string },
  thirdObject: { sign: string; link: string },
  fourthObject: { sign: string; link: string },
  fifthObject: { sign: string; link: string },
  sixthObject: { sign: string; link: string }
) {
  if (url.subdomain === subdomainName) {
    switch (url.pathname) {
      case firstObject.sign:
        return Response.redirect(firstObject.link)
        break
      case secondObject.sign:
        return Response.redirect(secondObject.link)
        break
      case thirdObject.sign:
        return Response.redirect(thirdObject.link)
        break
      case fourthObject.sign:
        return Response.redirect(fourthObject.link)
        break
      case fifthObject.sign:
        return Response.redirect(fifthObject.link)
        break
      case sixthObject.sign:
        return Response.redirect(sixthObject.link)
        break
      default:
        return createNotFoundResponse()
    }
  }
}

//ancora da fare
//     if (url.subdomain === 'meet') {
//       switch (url.pathname) {
//         case '/':
//           return Response.redirect('https://meet.google.com/vtk-ncrc-rdp')
//           break
//         case '/dev':
//           return Response.redirect('https://meet.google.com/rci-pize-jow')
//           break
//         case '/einbindung':
//           return Response.redirect('https://meet.google.com/qzv-ojgk-xqw')
//           break
//         case '/begleitung':
//           return Response.redirect('https://meet.google.com/kon-wdmt-yhb')
//           break
//         case '/reviewing':
//           return Response.redirect('https://meet.google.com/kon-wdmt-yhb')
//           break
//         case '/labschool':
//           return Response.redirect('https://meet.google.com/cvd-pame-zod')
//           break
//         default:
//           return createNotFoundResponse()
//       }
//     }

//     if (
//       url.subdomain === Instance.De &&
//       url.pathnameWithoutTrailingSlash === '/labschool'
//     ) {
//       url.subdomain = 'labschool'
//       url.pathname = '/'
//       return url.toRedirect(301)
//     }

//     if (
//       url.subdomain === Instance.De &&
//       url.pathnameWithoutTrailingSlash === '/hochschule'
//     ) {
//       url.pathname = '/mathe/universitaet/44323'
//       return url.toRedirect(301)
//     }

//     if (
//       url.subdomain === Instance.De &&
//       url.pathnameWithoutTrailingSlash === '/beitreten'
//     ) {
//       return Response.redirect(
//         'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
//         301
//       )
//     }

//     if (url.subdomain === 'www' || url.subdomain === '') {
//       url.subdomain = 'de'
//       return url.toRedirect()
//     }

//     if (
//       isInstance(url.subdomain) &&
//       url.isProbablyUuid() &&
//       request.headers.get('X-Requested-With') !== 'XMLHttpRequest'
//     ) {
//       const pathInfo = await getPathInfo(url.subdomain, url.pathname)

//       if (pathInfo !== null) {
//         const newUrl = new Url(url.href)
//         const { currentPath, instance } = pathInfo

//         if (instance && url.subdomain !== instance) newUrl.subdomain = instance
//         if (url.pathname !== currentPath) newUrl.pathname = currentPath

//         if (newUrl.href !== url.href) return newUrl.toRedirect(301)
//       }
//     }
//   }
