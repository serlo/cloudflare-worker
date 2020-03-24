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
import { gql } from 'apollo-server-cloudflare'

import { Instance } from './instance'
import { License, licenseResolvers } from './license'
import { Context, Resolver } from './types'
import { requestsOnlyFields } from './utils'

export const uuidTypeDefs = gql`
  extend type Query {
    uuid(alias: AliasInput, id: Int): Uuid
  }

  interface Uuid {
    id: Int!
  }

  interface Entity {
    instance: Instance!
    license: License!
  }

  type Article implements Uuid & Entity {
    id: Int!
    instance: Instance!
    license: License!
    currentRevision: ArticleRevision
  }

  type ArticleRevision implements Uuid {
    id: Int!
    title: String!
    content: String!
    changes: String!
  }

  type Page implements Uuid {
    id: Int!
  }

  input AliasInput {
    instance: Instance!
    path: String!
  }
`

export const uuidResolvers: {
  Query: {
    uuid: Resolver<
      undefined,
      {
        alias?: AliasInput
        id?: number
      },
      Uuid
    >
  }
  Article: {
    currentRevision: Resolver<Entity, {}, Partial<ArticleRevision>>
    license: Resolver<Entity, {}, Partial<License>>
  }
  Entity: {
    __resolveType(entity: Entity): EntityType
  }
  Uuid: {
    __resolveType(uuid: Uuid): UuidType
  }
} = {
  Query: {
    uuid,
  },
  Article: {
    async currentRevision(entity: Entity, _args, context, info) {
      const partialCurrentRevision = { id: entity.currentRevisionId }
      if (requestsOnlyFields('ArticleRevision', ['id'], info)) {
        return partialCurrentRevision
      }
      return uuid(undefined, partialCurrentRevision, context)
    },
    async license(entity: Entity, _args, context, info) {
      const partialLicense = { id: entity.licenseId }
      if (requestsOnlyFields('License', ['id'], info)) {
        return partialLicense
      }
      return licenseResolvers.Query.license(
        undefined,
        partialLicense,
        context,
        info
      )
    },
  },
  Entity: {
    __resolveType(entity: Entity) {
      return entity.__typename
    },
  },
  Uuid: {
    __resolveType(uuid: Uuid) {
      return uuid.__typename
    },
  },
}

enum EntityType {
  Article = 'Article',
}

enum EntityRevisionType {
  ArticleRevision = 'ArticleRevision',
}

enum DiscriminatorType {
  Page = 'Page',
}

type UuidType = DiscriminatorType | EntityType | EntityRevisionType

abstract class Uuid {
  public abstract __typename: UuidType
  public id: number

  public constructor(payload: { id: number }) {
    this.id = payload.id
  }
}

abstract class Entity extends Uuid {
  public abstract __typename: EntityType
  public instance: Instance
  public licenseId: number
  public currentRevisionId: number

  public constructor(payload: {
    id: number
    instance: Instance
    licenseId: number
    currentRevisionId: number
  }) {
    super(payload)
    this.instance = payload.instance
    this.licenseId = payload.licenseId
    this.currentRevisionId = payload.currentRevisionId
  }
}

class Article extends Entity {
  public __typename = EntityType.Article
}

abstract class EntityRevision extends Uuid {
  public abstract __typename: EntityRevisionType
}

class ArticleRevision extends EntityRevision {
  public __typename = EntityRevisionType.ArticleRevision
  public title: string
  public content: string
  public changes: string

  public constructor(payload: {
    id: number
    title: string
    content: string
    changes: string
  }) {
    super(payload)
    this.title = payload.title
    this.content = payload.content
    this.changes = payload.changes
  }
}

class Page extends Uuid {
  public __typename = DiscriminatorType.Page
}

interface AliasInput {
  instance: Instance
  path: string
}

async function uuid(
  _parent: unknown,
  { alias, id }: { id?: number; alias?: AliasInput },
  { dataSources }: Context
) {
  const data = alias
    ? await dataSources.serlo.getAlias(alias)
    : await dataSources.serlo.getUuid(id as number)

  switch (data.discriminator) {
    case 'entity':
      switch (data.type) {
        case 'article':
          return new Article(data)
      }
      break
    case 'entityRevision':
      switch (data.type) {
        case 'article':
          return new ArticleRevision({ ...data, ...data.fields })
      }
      break
    case 'page':
      return new Page(data)
  }
}
