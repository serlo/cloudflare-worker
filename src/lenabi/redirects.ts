/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Instance, Url } from '../utils'

export function lenabiRedirects(request: Request) {
  const url = Url.fromRequest(request)

  // To avoid cycles, add redirects to lenabi.serlo.org only.
  if (
    url.subdomain === 'lenabi' &&
    ['production', 'local'].includes(global.ENVIRONMENT)
  ) {
    switch (url.pathnameWithoutTrailingSlash) {
      case '/metadata-api':
        return Response.redirect(
          'https://nbviewer.org/github/serlo/lenabi/blob/4897124b9fb29938916a2ac79ae6d107a10f1433/src/Prototype%20of%20metadata%20API%20for%20serlo.org%20%28LENABI%29.ipynb',
          302
        )
      case '/data-wallet':
        return Response.redirect('https://lenabi.serlo-staging.dev/wallet', 302)
      case '/user-journey':
        return Response.redirect(
          'https://frontend-git-lenabi-flow-serlo.vercel.app/',
          302
        )
      case '/sso':
        return Response.redirect('https://lenabi.serlo-staging.dev/sso', 302)
      case '/status':
        return Response.redirect(
          'https://frontend-git-lenabi-flow-serlo.vercel.app/___lenabi_status',
          302
        )
      case '/docs':
        return Response.redirect('https://github.com/serlo/lenabi', 302)
      case '/docs/sso':
        return Response.redirect(
          'https://github.com/serlo/lenabi/wiki/Implementierung-der-Prototypen#sso',
          302
        )
    }
  }

  if (url.subdomain === Instance.De) {
    switch (url.pathnameWithoutTrailingSlash) {
      case '/lenabi/metadata-api':
        return Response.redirect('https://lenabi.serlo.org/metadata-api', 301)
      case '/lenabi/data-wallet':
        return Response.redirect('https://lenabi.serlo.org/data-wallet', 301)
      case '/lenabi/user-journey':
        return Response.redirect('https://lenabi.serlo.org/user-journey', 301)
    }
  }
}
