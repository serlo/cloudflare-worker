import { rest } from 'msw'

import { getUuid } from './database'
import { RestResolver, createUrlRegex } from './utils'
import { Instance } from '../../../src/utils'

export function givenApi(resolver: ApiRestResolver) {
  globalThis.server.use(
    rest.post(
      createUrlRegex({ subdomains: ['api'], pathname: '/graphql' }),
      resolver,
    ),
  )
}

export function defaultApiServer(): ApiRestResolver {
  return (req, res, ctx) => {
    if (!req.headers.get('Authorization')?.match(/^Serlo Service=ey/))
      return res(ctx.status(401, 'No authorization header given'))

    if (req.body === undefined)
      return res(ctx.status(400, 'request body is missing'))
    if (
      req.headers.get('Content-Type') !== 'application/json' ||
      typeof req.body === 'string'
    )
      return res(ctx.status(400, 'Content-Type is not application/json'))

    const { instance, path } = req.body.variables.alias

    if (path == null || instance == null)
      return res(ctx.status(400, 'variable "alias" wrongly defined'))

    const uuid = getUuid(instance, path)

    if (uuid === undefined) {
      const statusText = `Nothing found for "${path}"`

      return res(ctx.status(404, statusText))
    }

    const result = { ...uuid }
    delete result['oldAlias']

    if (result.alias !== undefined)
      result.alias = encodeURIComponent(result.alias).replace(/%2F/g, '/')

    return res(ctx.json({ data: { uuid: result } }))
  }
}

type ApiRestResolver = RestResolver<{
  variables: { alias: { instance: Instance; path: string } }
}>
