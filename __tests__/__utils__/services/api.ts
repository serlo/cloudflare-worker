import { http, HttpResponse, ResponseResolver } from 'msw'

import { getUuid } from './database'
import { badRequest, createUrlRegex } from './utils'
import { Instance } from '../../../src/utils'

export function givenApi(resolver: ResponseResolver) {
  globalThis.server.use(
    http.post(
      createUrlRegex({ subdomains: ['api'], pathname: '/graphql' }),
      resolver,
    ),
  )
}

export function defaultApiServer(): ResponseResolver {
  return async ({ request }) => {
    if (!request.headers.get('Authorization')?.match(/^Serlo Service=ey/))
      return badRequest('No authorization header given')

    if (request.headers.get('Content-Type') !== 'application/json')
      return badRequest('Content-Type is not application/json')

    const body = (await request.json()) as ApiRequestBody
    const { instance, path } = body.variables.alias

    if (path == null || instance == null)
      return badRequest('variable "alias" wrongly defined')

    const uuid = getUuid(instance, path)

    if (uuid === undefined) {
      return badRequest(`Nothing found for "${path}"`)
    }

    const result = { ...uuid }
    delete result['oldAlias']

    if (result.alias !== undefined)
      result.alias = encodeURIComponent(result.alias).replace(/%2F/g, '/')

    return HttpResponse.json({ data: { uuid: result } })
  }
}

interface ApiRequestBody {
  variables: { alias: { instance: Instance; path: string } }
}
