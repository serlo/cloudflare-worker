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
        serlo: new SerloDataSource(),
      }
    },
  })
}

function setCorsHeaders(response: Response) {
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Headers', 'Content-type')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST')
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('X-Content-Type-Options', 'nosniff')
}
