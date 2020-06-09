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
import { fetchSheet, MajorDimension, Sheet } from './google-api-utils'
import { getPathname, getSubdomain } from './url-utils'
import { convertTo, createJsonResponse, isNotNullable } from './utils'

// See https://www.everythingfrontend.com/posts/newtype-in-typescript.html
type UserId = string & { readonly __tag: unique symbol }

export interface Options {
  spreadsheetId?: string
  apiKey?: string
}

export async function handleRequest(
  req: Request,
  opt?: Options
): Promise<Response | null> {
  const url = req.url

  if (getSubdomain(url) !== 'api') return null
  if (getPathname(url) !== '/community/active-donors') return null

  const spreadsheetId =
    opt?.spreadsheetId ?? global.SPREADSHEET_ID_ACTIVE_DONORS
  const apiKey = opt?.apiKey ?? global.GOOGLE_API_KEY

  const sheet = await fetchSheet({
    spreadsheetId,
    apiKey,
    range: 'Tabellenblatt1!A:A',
    majorDimension: MajorDimension.Columns,
  })

  const userIds = sheet !== null ? extractUserIdsFromSheet(sheet) : null

  return createJsonResponse(userIds ?? [])
}

export function extractUserIdsFromSheet(sheet: Sheet): UserId[] | null {
  return (sheet.values[0] ?? [])
    .slice(1)
    .map((entry) => convertTo(isUserId, entry))
    .filter(isNotNullable)
}

export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && /^\d+$/.test(value)
}
