import { rest } from 'msw'
import { setupServer } from 'msw/node'

import { handleRequest } from '../src'
import { expectIsJsonResponse } from './_helper'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})


function serverMock(url_e: string, body_e: string){
  server.use(
    rest.get(url_e, (_req, res, ctx) => {
      return res.once(ctx.status(200), ctx.body(body_e))
    })
  )
}

test('Frontend Sector Identifier URI Validation (block localhost)', async () => {
  serverMock('https://serlo.org/auth/frontend-redirect-uris.json','')

  global.ALLOW_AUTH_FROM_LOCALHOST = 'false'
  global.DOMAIN = 'serlo.org'
  
  const response = await handleRequest(
    new Request('https://serlo.org/auth/frontend-redirect-uris.json')
  )
  await expectIsJsonResponse(response, [
    'https://de.serlo.org/api/auth/callback',
    'https://en.serlo.org/api/auth/callback',
    'https://es.serlo.org/api/auth/callback',
    'https://fr.serlo.org/api/auth/callback',
    'https://hi.serlo.org/api/auth/callback',
    'https://ta.serlo.org/api/auth/callback',
  ])
})

test('Frontend Sector Identifier URI Validation (allow localhost)', async () => {
  serverMock('https://serlo.org/auth/frontend-redirect-uris.json','')
  
  global.ALLOW_AUTH_FROM_LOCALHOST = 'true'
  global.DOMAIN = 'serlo.org'
  const response = await handleRequest(
    new Request('https://serlo.org/auth/frontend-redirect-uris.json')
  )
  await expectIsJsonResponse(response, [
    'https://de.serlo.org/api/auth/callback',
    'https://en.serlo.org/api/auth/callback',
    'https://es.serlo.org/api/auth/callback',
    'https://fr.serlo.org/api/auth/callback',
    'https://hi.serlo.org/api/auth/callback',
    'https://ta.serlo.org/api/auth/callback',
    'http://localhost:3000/api/auth/callback',
  ])
})
