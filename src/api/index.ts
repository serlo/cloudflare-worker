import { getPathname, getSubdomain } from '../url-utils'
import { ApolloServer } from 'apollo-server-cloudflare'
import { graphqlCloudflare } from 'apollo-server-cloudflare/dist/cloudflareApollo'
import { Request as ApolloServerRequest } from 'apollo-server-env/dist/fetch'

import { SerloDataSource } from './data-sources/serlo'
import { typeDefs, resolvers } from './schema'
import { graphiql } from './graphiql'

export async function api(request: Request) {
  if (getSubdomain(request.url) !== 'api') return null

  if (getPathname(request.url) === '/graphql') {
    if (request.method === 'OPTIONS') {
      const response = new Response('', { status: 204 })
      setCorsHeaders(response)
      return response
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

  if (getPathname(request.url) === '/___graphql') {
    return new Response(graphiql, { headers: { 'Content-Type': 'text/html' } })
  }
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
  response.headers.set('Access-Control-Allow-Headers', 'Content-type')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST')
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('X-Content-Type-Options', 'nosniff')
}
