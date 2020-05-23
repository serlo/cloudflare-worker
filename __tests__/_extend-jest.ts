import { FetchMock } from './_helper'

export function extendExpect() {
  expect.extend({ toHaveBeenCalledFor, toHaveBeenCalledOnceFor })
}

function toHaveBeenCalledFor(
  this: jest.MatcherUtils,
  mockedFetch: FetchMock,
  url: string
): jest.CustomMatcherResult {
  const numberOfCalls = mockedFetch.getAllRequestsFor(url).length

  return {
    pass: numberOfCalls > 0,
    message: () => `URL ${url} was called ${numberOfCalls} times`,
  }
}

function toHaveBeenCalledOnceFor(
  this: jest.MatcherUtils,
  mockedFetch: FetchMock,
  url: string
): jest.CustomMatcherResult {
  const numberOfCalls = mockedFetch.getAllRequestsFor(url).length

  return {
    pass: numberOfCalls === 1,
    message: () => `URL ${url} was called ${numberOfCalls} times`,
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledFor(url: string): R
      toHaveBeenCalledOnceFor(url: string): R
    }
  }
}
