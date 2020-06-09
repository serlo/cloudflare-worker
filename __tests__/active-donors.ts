import {
  extractUserIdsFromSheet,
  fetchSheet,
  handleRequest,
  isObject,
  isSheet,
  isUserId,
  MajorDimension,
  Options,
  to,
} from '../src/active-donors'
import { createJsonResponse } from '../src/utils'
import { mockFetch, FetchMock, expectHasOkStatus } from './_helper'

describe('handleRequest()', () => {
  describe('returns response with list of user ids from spreadsheet', () => {
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/active-donors-spreadsheet/values/Tabellenblatt1!A:A?majorDimension=COLUMNS&key=api-secret'
    let fetch: FetchMock
    let response: Response

    beforeEach(async () => {
      fetch = mockFetch({
        [sheetUrl]: createJsonResponse({
          values: [['Header', '10', '20', '30']],
        }),
      })

      response = await handleUrl(
        'https://api.serlo.org/community/active-donors',
        {
          spreadsheetId: 'active-donors-spreadsheet',
          apiKey: 'api-secret',
        }
      )
    })

    test('response has list of user ids as JSON encoded', async () => {
      expect(await response.json()).toEqual(['10', '20', '30'])
    })

    test('response has ok status', () => {
      expectHasOkStatus(response)
    })

    test('spreadsheet api url was called exactly one time', () => {
      expect(fetch).toHaveExactlyOneRequestTo(sheetUrl)
    })
  })

  test('"spreadsheetId" and "apiKey" are optional and their default value are set by global values', async () => {
    global.GOOGLE_API_KEY = 'global-api-key'
    global.SPREADSHEET_ID_ACTIVE_DONORS = 'global-spreadsheet-id'
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/global-spreadsheet-id/values/Tabellenblatt1!A:A?majorDimension=COLUMNS&key=global-api-key'
    mockFetch({
      [sheetUrl]: createJsonResponse({
        values: [['Header', '10', '20', '30']],
      }),
    })

    const response = await handleUrl(
      'https://api.serlo.org/community/active-donors'
    )

    expect(await response.json()).toEqual(['10', '20', '30'])
  })

  test('returns JSON response with empty list when an error occurred', async () => {
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/active-donors-spreadsheet/values/Tabellenblatt1!A:A?majorDimension=COLUMNS&key=api-secret'
    mockFetch({ [sheetUrl]: createJsonResponse({}) })

    const response = await handleUrl(
      'https://api.serlo.org/community/active-donors',
      {
        spreadsheetId: 'active-donors-spreadsheet',
        apiKey: 'api-secret',
      }
    )

    expect(await response.json()).toEqual([])
  })

  describe('returns null if subdomain ist not "api"', () => {
    test('when url has no subdomain', async () => {
      const url = 'https://serlo.org/community/active-donors'

      expect(await handleUrl(url)).toBeNull()
    })

    test('when subdomain is different from "api"', async () => {
      const url = 'https://en.serlo.org/community/active-donors'

      expect(await handleUrl(url)).toBeNull()
    })
  })

  test('returns null if path is not "/community/active-donors"', async () => {
    const response = await handleUrl('https://api.serlo.org/graphql')

    expect(response).toBeNull()
  })
})

describe('extractUserIdsFromSheet()', () => {
  test('returns list of user ids (entries of first column without the header)', () => {
    expect(
      extractUserIdsFromSheet({ values: [['Header', '23', '42']] })
    ).toEqual(['23', '42'])
  })

  test('wrong formatted user ids are filtered out', () => {
    expect(
      extractUserIdsFromSheet({ values: [['Header', '23', null, 'f56', '1']] })
    ).toEqual(['23', '1'])
  })
})

describe('fetchSheet()', () => {
  test('fetches a spreadsheet via the Google Sheet API', async () => {
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/my-spreadsheet/values/sheet!A:A?majorDimension=COLUMNS&key=my-secret'
    const fetch = mockFetch({
      [sheetUrl]: createJsonResponse({ values: [['1', '2']] }),
    })

    const sheet = await fetchSheet({
      spreadsheetId: 'my-spreadsheet',
      range: 'sheet!A:A',
      key: 'my-secret',
      majorDimension: MajorDimension.Columns,
    })

    expect(sheet).toEqual({ values: [['1', '2']] })
    expect(fetch).toHaveExactlyOneRequestTo(sheetUrl)
  })

  test('"key" and "majorDimension" are optional arguments', async () => {
    global.GOOGLE_API_KEY = 'global-secret'
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id/values/sheet1!A1?majorDimension=ROWS&key=global-secret'
    mockFetch({ [sheetUrl]: createJsonResponse({ values: [['1', '2']] }) })

    const sheet = await fetchSheet({
      spreadsheetId: 'spreadsheet-id',
      range: 'sheet1!A1',
    })

    expect(sheet).toEqual({ values: [['1', '2']] })
  })

  describe('returns null in case an error occurred', () => {
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/my-spreadsheet/values/sheet!A:A?majorDimension=COLUMNS&key=my-secret'

    test('when the google api returns malformed json', async () => {
      mockFetch({ [sheetUrl]: 'no-json-text' })

      const sheet = await fetchSheet({
        spreadsheetId: 'my-spreadsheet',
        range: 'sheet!A:A',
        key: 'my-secret',
        majorDimension: MajorDimension.Columns,
      })

      expect(sheet).toBeNull()
    })

    test('returns null in case the result is malformed', async () => {
      mockFetch({ [sheetUrl]: createJsonResponse({ values: null }) })

      const sheet = await fetchSheet({
        spreadsheetId: 'my-spreadsheet',
        range: 'sheet!A:A',
        key: 'my-secret',
        majorDimension: MajorDimension.Columns,
      })

      expect(sheet).toBeNull()
    })
  })
})

describe('to()', () => {
  type Foo = 'foo'

  function isFoo(value: unknown): value is Foo {
    return value === 'foo'
  }

  test('returns argument if it fulfills the type guard', () => {
    expect(to(isFoo, 'foo')).toBe('foo')
  })

  test('returns null if argument does not fulfill the type guard', () => {
    expect(to(isFoo, 'bar')).toBeNull()
  })
})

describe('isSheet()', () => {
  test('returns true if argument extends "{ values: unknown[][] }"', () => {
    expect(isSheet({ values: [[1, 2, 3]] })).toBe(true)
  })

  describe('returns false if argument does not extend "{ values: unknown[][]}"', () => {
    test('argument is no object', () => {
      expect(isSheet(1)).toBe(false)
    })

    test('argument is null', () => {
      expect(isSheet(null)).toBe(false)
    })

    test('argument has no "values" argument', () => {
      expect(isSheet({})).toBe(false)
    })

    test('"values" property is not a list', () => {
      expect(isSheet({ values: null })).toBe(false)
    })

    test('"values" property is an empty list', () => {
      expect(isSheet({ values: [] })).toBe(false)
    })
  })

  test('returns false if column list is empty', () => {
    expect(isSheet({ values: [[]] })).toBe(false)
  })
})

describe('isObject()', () => {
  test('returns true if argument is an object', () => {
    expect(isObject({})).toBe(true)
  })

  test('returns false if argument is null (`typeof null` results in `object`)', () => {
    expect(isObject(null)).toBe(false)
  })

  test('returns false if argument is not an object', () => {
    expect(isObject(1)).toBe(false)
  })
})

describe('isUserId()', () => {
  test('returns true if argument is a nonempty string containing only digits', () => {
    expect(isUserId('1')).toBe(true)
    expect(isUserId('0000')).toBe(true)
  })

  test('returns false if argument is a string containing a character not being a digit', () => {
    expect(isUserId('123foo')).toBe(false)
    expect(isUserId('0.5')).toBe(false)
    expect(isUserId('-1')).toBe(false)
  })

  test('returns false if argument is an empty string', () => {
    expect(isUserId('')).toBe(false)
  })

  test('returns false if argument is not a string', () => {
    expect(isUserId(1)).toBe(false)
    expect(isUserId([])).toBe(false)
    expect(isUserId({})).toBe(false)
    expect(isUserId(undefined)).toBe(false)
  })
})

async function handleUrl(url: string, options?: Options): Promise<Response> {
  return (await handleRequest(new Request(url), options)) as Response
}
