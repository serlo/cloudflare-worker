import { GraphQLResolveInfo } from 'graphql'
import { parseResolveInfo } from 'graphql-parse-resolve-info'
import * as R from 'ramda'

export function requestsOnlyFields(
  type: string,
  fields: string[],
  info: GraphQLResolveInfo
): boolean {
  const res = parseResolveInfo(info)
  return !res || R.isEmpty(R.omit(fields, res.fieldsByTypeName[type]))
}
