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
import {
  extractUserIdsFromSheet,
  handleRequest,
  isUserId,
  Options,
} from '../src/active-donors'
import { createJsonResponse } from '../src/utils'
import { mockFetch, FetchMock, expectHasOkStatus } from './_helper'

describe('handleRequest()', () => {
  const apiUrl = 'https://api.serlo.org/community/active-donors'

  const commonSheetUrl =
    'https://sheets.googleapis.com/v4/spreadsheets/active-donors' +
    '/values/Tabellenblatt1!A:A?majorDimension=COLUMNS&key=api-secret'

  const commonOptions = { spreadsheetId: 'active-donors', apiKey: 'api-secret' }

  describe('returns response with list of user ids from spreadsheet', () => {
    let fetch: FetchMock
    let response: Response

    beforeEach(async () => {
      const sheetData = { values: [['Header', '10', '20', '30']] }

      fetch = mockFetch({ [commonSheetUrl]: createJsonResponse(sheetData) })

      response = await handleUrl(apiUrl, commonOptions)
    })

    test('response has JSON encoded list of user ids', async () => {
      expect(await response.json()).toEqual(['10', '20', '30'])
    })

    test('response has ok status', () => {
      expectHasOkStatus(response)
    })

    test('spreadsheet api url was called exactly one time', () => {
      expect(fetch).toHaveExactlyOneRequestTo(commonSheetUrl)
    })
  })

  test('"spreadsheetId" and "apiKey" are optional arguments', async () => {
    const sheetData = { values: [['Header', '10', '20', '30']] }
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/global-spreadsheet-id' +
      '/values/Tabellenblatt1!A:A?majorDimension=COLUMNS&key=global-api-key'

    global.GOOGLE_API_KEY = 'global-api-key'
    global.SPREADSHEET_ID_ACTIVE_DONORS = 'global-spreadsheet-id'
    mockFetch({ [sheetUrl]: createJsonResponse(sheetData) })

    const response = await handleUrl(apiUrl)

    expect(await response.json()).toEqual(['10', '20', '30'])
  })

  test('returns JSON response with empty list when an error occurred', async () => {
    mockFetch({ [commonSheetUrl]: createJsonResponse({}) })

    const response = await handleUrl(apiUrl, commonOptions)

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
    expect(await handleUrl('https://api.serlo.org/graphql')).toBeNull()
  })

  async function handleUrl(url: string, options?: Options): Promise<Response> {
    return (await handleRequest(new Request(url), options)) as Response
  }
})

describe('extractUserIdsFromSheet()', () => {
  test('returns list of user ids (entries of first column without the header)', () => {
    const result = extractUserIdsFromSheet({ values: [['Header', '23', '42']] })

    expect(result).toEqual(['23', '42'])
  })

  test('wrong formatted user ids are filtered out', () => {
    const result = extractUserIdsFromSheet({
      values: [['Header', '23', 'f56', '1', '0.5']],
    })

    expect(result).toEqual(['23', '1'])
  })

  test('returns empty list when no data is given', () => {
    expect(extractUserIdsFromSheet({ values: [[]] })).toEqual([])
    expect(extractUserIdsFromSheet({ values: [] })).toEqual([])
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
