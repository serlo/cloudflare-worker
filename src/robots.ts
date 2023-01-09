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
import { Url } from './utils'

const robotsProduction = `User-agent: *
Disallow: /page/revision/revisions/
Disallow: /page/revision/revision/
Disallow: /page/revision/
Disallow: /entity/repository/history/
Disallow: /entity/repository/compare/
Disallow: /backend
Disallow: /users
Disallow: /horizon
Disallow: /flag
Disallow: /license
Disallow: /uuid/recycle-bin
Disallow: /navigation/
Disallow: /authorization/
Disallow: /pages
Disallow: /uuid/recycle-bin
Disallow: /index.php/
Disallow: /index.php
Disallow: /*/entity/trash-bin`

export function robotsTxt(request: Request) {
  const url = Url.fromRequest(request)
  if (url.pathname !== '/robots.txt') return null

  return new Response(
    global.ENVIRONMENT === 'production'
      ? robotsProduction
      : 'User-agent: *\nDisallow: /\n'
  )
}
