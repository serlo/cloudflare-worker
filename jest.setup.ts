// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import { type Event as SentryEvent } from '@sentry/types'
import * as cryptoNode from 'crypto'
import { http } from 'msw'
import { setupServer } from 'msw/node'

import {
  currentTestEnvironment,
  defaultApiServer,
  defaultFrontendServer,
  getDefaultCFEnvironment,
  givenApi,
  givenFrontend,
  Uuid,
} from './__tests__/__utils__'

const timeout = currentTestEnvironment().getNeededTimeout()

if (timeout) {
  jest.setTimeout(timeout)
}

beforeAll(() => {
  globalThis.server = setupServer()
  globalThis.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  globalThis.uuids = new Array<Uuid>()

  givenApi(defaultApiServer())
  givenFrontend(defaultFrontendServer())

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
  // `@cloudflare/workers-types` defines `crypto` to be on the
  // [self](https://developer.mozilla.org/en-US/docs/Web/API/Window/self)
  // property which makes sense for a workers environment. However when we run
  // the tests via node `self` is not defined and we need to set global variables
  // via `global` or `globalThis`.
  //
  // @ts-expect-error When running node `self` is not defined but `globalThis` is
  globalThis.crypto = {
    subtle: {
      digest(encoding: string, message: Uint8Array) {
        return Promise.resolve(
          cryptoNode
            .createHash(encoding.toLowerCase().replace('-', ''))
            .update(message)
            .digest(),
        )
      },
    },
    randomUUID: cryptoNode.randomUUID,
  } as unknown as typeof crypto
}

function mockSentryServer() {
  const { hostname, pathname } = new URL(getDefaultCFEnvironment().SENTRY_DSN)
  const sentryUrl = `https://${hostname}/api${pathname}/envelope/`

  globalThis.server.use(
    http.post(sentryUrl, async ({ request }) => {
      const reqText = await request.text()
      const events = reqText
        .split('\n')
        .map((x) => JSON.parse(x) as SentryEvent)

      globalThis.sentryEvents.push(...events)

      return new Response()
    }),
  )
}

export {}

declare global {
  // eslint-disable-next-line no-var
  var server: ReturnType<typeof import('msw/node').setupServer>
  // eslint-disable-next-line no-var
  var sentryEvents: SentryEvent[]
}
