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

import { Instance } from '../../../src/utils'

declare global {
  // eslint-disable-next-line no-var
  var uuids: Uuid[]
}

export function givenUuid(uuid: Uuid) {
  globalThis.uuids.push(uuid)
}

export function getUuid(instance: string, path: string) {
  const regexes = [
    new RegExp('^/(?<id>\\d+)$'),
    new RegExp('(?<subject>[^/]+/)?(?<id>\\d+)/(?<title>[^/]*)$'),
  ]

  for (const regex of regexes) {
    const match = regex.exec(path)

    if (match) {
      const id = parseInt(match?.groups?.id ?? '')
      return globalThis.uuids.find((u) => u.id === id)
    }
  }

  return globalThis.uuids.find(
    (u) =>
      u.instance === instance &&
      [u.alias, u.oldAlias].includes(decodeURIComponent(path))
  )
}

export type Uuid = GenericUuid | Course | Solution

interface Course extends AbstractUuid<'Course'> {
  pages?: { alias: string }[]
}
interface Solution extends AbstractUuid<'Solution'> {
  exercise?: { alias: string }
}

interface GenericUuid extends AbstractUuid<GenericTypenames> {}

type GenericTypenames = 'Page' | 'Article' | 'TaxonomyTerm' | 'Comment'

interface AbstractUuid<Typename extends string> {
  __typename: Typename
  id?: number
  alias?: string
  oldAlias?: string
  instance?: Instance
  content?: string
  legacyObject?: { alias: string }
  trashed?: boolean
}
