import { getPathname, getSubdomain } from '../url-utils'
import { ApolloServer } from 'apollo-server-cloudflare'
import { graphqlCloudflare } from 'apollo-server-cloudflare/dist/cloudflareApollo'
import { Request as ApolloServerRequest } from 'apollo-server-env/dist/fetch'

import { SerloDataSource } from './data-sources/serlo'
import { typeDefs, resolvers } from './schema'

export async function api(request: Request) {
  if (
    getSubdomain(request.url) !== 'api' ||
    getPathname(request.url) !== '/graphql'
  ) {
    return null
  }

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204 })
  }

  const server = createGraphQLServer()
  const apolloServerRequest = (request as unknown) as ApolloServerRequest
  const apolloServerResponse = await graphqlCloudflare(() => {
    return server.createGraphQLServerOptions(apolloServerRequest)
  })(apolloServerRequest)
  const response = (apolloServerResponse as unknown) as Response
  setCorsHeaders(response)
  return response
}

export function createGraphQLServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    dataSources() {
      return {
        serlo: new SerloDataSource()
      }
    }
  })
}

function setCorsHeaders(response: Response) {
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'application/json, Content-type'
  )
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST')
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('X-Content-Type-Options', 'nosniff')
}
