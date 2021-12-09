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
import * as t from 'io-ts'

import { fetchApi } from './api'
import { Url } from './utils'

const Publisher = t.type({
  id: t.string,
  name: t.string,
  alternateName: t.string,
})
type Publisher = t.TypeOf<typeof Publisher>

const Entity = t.type({
  id: t.string,
  name: t.union([t.null, t.string]),
  learningResourceType: t.string,
})
type Entity = t.TypeOf<typeof Entity>

const MetadataResponse = t.type({
  data: t.type({
    metadata: t.type({
      publisher: Publisher,
      entities: t.type({
        nodes: t.array(Entity),
      }),
    }),
  }),
})

export async function birdMetadataApi(request: Request) {
  if (!isMetadataApiRequest(request)) {
    return null
  }

  const query = `
    query($first: Int, $instance: Instance) {
      metadata {
        publisher
        entities(first: $first, instance: $instance) {
          nodes
        }
      }
    }
  `
  const variables = { first: 500, instance: 'de' }

  const apiResponse = await fetchApi(
    new Request(global.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
  )

  if (apiResponse.status !== 200) {
    return createInternalServerError()
  }

  const data = (await apiResponse.json()) as unknown

  if (!MetadataResponse.is(data)) {
    return createInternalServerError(MetadataResponse.decode(data))
  }

  const { publisher } = data.data.metadata
  const entities = data.data.metadata.entities.nodes

  const result = `<?xml version="1.0"?>
<import xmlns="https://www.mathplan.de/moses/xsd/default" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <list type="bird_academy">
        <bird_academy>
            <id>${publisher.id}</id>
            <name>${publisher.name}</name>
            <kurzname>${publisher.alternateName}</kurzname>
        </bird_academy>
    </list>
    <list type="bird_course">
        ${entities
          .map((entity) => createBirdCourse(entity, publisher))
          .join('\n')}
    </list>
</import>`

  return new Response(result, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

function createBirdCourse(entity: Entity, publisher: Publisher) {
  return `
    <bird_course>
      <id>${entity.id}</id>
      <name>${
        entity.name ?? `${entity.learningResourceType}: ${entity.id}`
      }</name>
      <academyId>${publisher.id}</academyId>
      <lectureType>${entity.learningResourceType}</lectureType>
    </bird_course>
  `
}

function isMetadataApiRequest(request: Request) {
  const url = Url.fromRequest(request)

  if (ENVIRONMENT !== 'local' && ENVIRONMENT !== 'staging') return false

  if (
    (url.subdomain === 'lenabi-api' &&
      url.pathnameWithoutTrailingSlash === '/metadata/bird_academy') ||
    (url.subdomain === 'lenabi' &&
      url.pathnameWithoutTrailingSlash === '/api/metadata/bird_academy')
  )
    return true

  return false
}

function createInternalServerError(ctx?: any) {
  return new Response(
    'An internal server error occured' + JSON.stringify(ctx),
    { status: 500 }
  )
}
