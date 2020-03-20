import { gql } from 'apollo-server-cloudflare'

import { Instance } from './instance'
import { Context, Resolver } from './types'

export const licenseTypeDefs = gql`
  extend type Query {
    license(id: Int!): License
  }

  type License {
    id: Int!
    instance: Instance!
    default: Boolean!
    title: String!
    url: String!
    content: String!
    agreement: String!
    iconHref: String!
  }
`

export interface License {
  id: number
  instance: Instance
  default: boolean
  title: string
  content: string
  agreement: string
  iconHref: string
}

export const licenseResolvers: {
  Query: {
    license: Resolver<undefined, { id: number }, License>
  }
} = {
  Query: {
    license
  }
}

async function license(
  _parent: unknown,
  { id }: { id: number },
  { dataSources }: Context
) {
  return dataSources.serlo.getLicense(id)
}
