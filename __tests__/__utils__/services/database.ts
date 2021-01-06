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

import { Instance } from '../../../src/utils'

export function givenUuid(uuid: Uuid) {
  global.uuids.push(uuid)
}

export type Uuid = GenericUuid | Course

interface Course extends AbstractUuid<'Course'> {
  pages?: { alias: string }[]
}

interface GenericUuid extends AbstractUuid<GenericTypenames> {}

type GenericTypenames = 'Page' | 'Article' | 'TaxonomyTerm' | 'ArticleRevision'

interface AbstractUuid<Typename extends string> {
  __typename: Typename
  id?: number
  alias?: string
  oldAlias?: string
  instance?: Instance
}
