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
import { fetchSheet, MajorDimension, isSheet } from '../src/google-api-utils'
import { createJsonResponse } from '../src/utils'
import { mockFetch } from './_helper'

describe('fetchSheet()', () => {
  const commonSheetUrl =
    'https://sheets.googleapis.com/v4/spreadsheets/my-spreadsheet-id' +
    '/values/sheet1!A:A?majorDimension=COLUMNS&key=my-secret'

  const commonFetchSheetArgs = {
    spreadsheetId: 'my-spreadsheet-id',
    range: 'sheet1!A:A',
    apiKey: 'my-secret',
    majorDimension: MajorDimension.Columns,
  }

  test('fetches a spreadsheet via the Google Sheet API', async () => {
    const fetch = mockFetch({
      [commonSheetUrl]: createJsonResponse({ values: [['1', '2']] }),
    })

    const sheet = await fetchSheet(commonFetchSheetArgs)

    expect(sheet).toEqual({ values: [['1', '2']] })
    expect(fetch).toHaveExactlyOneRequestTo(commonSheetUrl)
  })

  test('"key" and "majorDimension" are optional arguments', async () => {
    const sheetUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id' +
      '/values/sheet1!A1?majorDimension=ROWS&key=global-secret'

    global.GOOGLE_API_KEY = 'global-secret'
    mockFetch({ [sheetUrl]: createJsonResponse({ values: [['1', '2']] }) })

    const sheet = await fetchSheet({
      spreadsheetId: 'spreadsheet-id',
      range: 'sheet1!A1',
    })

    expect(sheet).toEqual({ values: [['1', '2']] })
  })

  describe('returns null in case an error occurred', () => {
    test('when the google api returns malformed json', async () => {
      mockFetch({ [commonSheetUrl]: 'no-json-text' })

      const sheet = await fetchSheet(commonFetchSheetArgs)

      expect(sheet).toBeNull()
    })

    test('when the result does not extend type Sheet', async () => {
      mockFetch({ [commonSheetUrl]: createJsonResponse({ values: null }) })

      const sheet = await fetchSheet(commonFetchSheetArgs)

      expect(sheet).toBeNull()
    })
  })
})

describe('isSheet()', () => {
  describe('returns true if argument extends type Sheet', () => {
    test('matrix of entries is not empty', () => {
      const data = { values: [['1', '2', '3'], ['4']] }

      expect(isSheet(data)).toBe(true)
    })

    test('matrix of entries is empty', () => {
      expect(isSheet({ values: [[]] })).toBe(true)
      expect(isSheet({ values: [] })).toBe(true)
    })
  })

  describe('returns false if argument does not extend type Sheet', () => {
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

    test('"values" list contains a non list', () => {
      expect(isSheet({ values: [['1'], 1] })).toBe(false)
    })

    test('entries of "values" are not strings', () => {
      expect(isSheet({ values: [['1'], [1]] })).toBe(false)
    })
  })
})
