import { GraphQLResolveInfo } from 'graphql'

import { DataSources } from '../data-sources'

export type Resolver<P, A, T> = (
  parent: P,
  args: A,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<T | void>

export interface Context {
  dataSources: DataSources
}
