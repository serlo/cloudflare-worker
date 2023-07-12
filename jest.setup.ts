// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom'
import { type Event as SentryEvent } from '@sentry/types'
import * as cryptoNode from 'crypto'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

import {
  createKV,
  currentTestEnvironment,
  defaultApiServer,
  defaultFrontendServer,
  defaultSerloServer,
  givenApi,
  givenFrontend,
  givenSerlo,
  localTestEnvironment,
  Uuid,
} from './__tests__/__utils__'

const timeout = currentTestEnvironment().getNeededTimeout()

if (timeout) {
  jest.setTimeout(timeout)
}

beforeAll(() => {
  globalThis.API_ENDPOINT = 'https://api.serlo.org/graphql'
  globalThis.server = setupServer()
  globalThis.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  globalThis.API_SECRET = 'secret'
  globalThis.DOMAIN = localTestEnvironment().getDomain()
  globalThis.ENVIRONMENT = 'local'
  globalThis.FRONTEND_DOMAIN = 'frontend.serlo.localhost'

  globalThis.PATH_INFO_KV = createKV()
  globalThis.PACKAGES_KV = createKV()

  globalThis.uuids = new Array<Uuid>()

  givenApi(defaultApiServer())
  givenFrontend(defaultFrontendServer())
  givenSerlo(defaultSerloServer())

  globalThis.SENTRY_DSN = 'https://public@127.0.0.1/0'
  globalThis.sentryEvents = []
  mockSentryServer()

  addGlobalMocks()
})

afterEach(() => {
  globalThis.server.resetHandlers()
})

afterAll(() => {
  globalThis.server.close()
})

function addGlobalMocks() {
  globalThis.crypto = {
    subtle: {
      digest(encoding: string, message: Uint8Array) {
        return Promise.resolve(
          cryptoNode
            .createHash(encoding.toLowerCase().replace('-', ''))
            .update(message)
            .digest()
        )
      },
    },
    randomUUID: cryptoNode.randomUUID,
  } as unknown as typeof crypto
}

function mockSentryServer() {
  const { hostname, pathname } = new URL(globalThis.SENTRY_DSN)
  const sentryUrl = `https://${hostname}/api${pathname}/envelope/`

  globalThis.server.use(
    rest.post<SentryEvent>(sentryUrl, async (req, res, ctx) => {
      const reqText = await req.text()
      const events = reqText
        .split('\n')
        .map((x) => JSON.parse(x) as SentryEvent)

      globalThis.sentryEvents.push(...events)

      return res(ctx.status(200))
    })
  )
}

export {}

declare global {
  // eslint-disable-next-line no-var
  var server: ReturnType<typeof import('msw/node').setupServer>
  // eslint-disable-next-line no-var
  var sentryEvents: SentryEvent[]
}
