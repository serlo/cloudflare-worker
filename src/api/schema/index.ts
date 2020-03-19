import { gql } from 'apollo-server-cloudflare'

import { instanceTypeDefs } from './instance'
import { licenseResolvers, licenseTypeDefs } from './license'
import { uuidResolvers, uuidTypeDefs } from './uuid'

export const schemaTypeDefs = gql`
  type Query {
    _version: String
  }
`

export const typeDefs = [
  schemaTypeDefs,
  instanceTypeDefs,
  licenseTypeDefs,
  uuidTypeDefs
]

export const resolvers = {
  ...uuidResolvers,
  ...licenseResolvers,
  Query: {
    ...uuidResolvers.Query,
    ...licenseResolvers.Query
  }
}
