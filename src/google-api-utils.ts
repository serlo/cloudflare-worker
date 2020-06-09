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
import * as R from 'ramda'

import { convertTo } from './utils'

export interface Sheet {
  values: string[][]
}

export enum MajorDimension {
  Rows = 'ROWS',
  Columns = 'COLUMNS',
}

export async function fetchSheet({
  spreadsheetId,
  range,
  apiKey = global.GOOGLE_API_KEY,
  majorDimension = MajorDimension.Rows,
}: {
  spreadsheetId: string
  range: string
  apiKey?: string
  majorDimension?: MajorDimension
}): Promise<Sheet | null> {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `/values/${range}?majorDimension=${majorDimension}&key=${apiKey}`
  const response = await fetch(url)
  let data: unknown

  try {
    data = await response.json()
  } catch (error) {
    return null
  }

  return convertTo(isSheet, data)
}

export function isSheet(data: unknown): data is Sheet {
  const isStringArray = (data: unknown) =>
    Array.isArray(data) && data.every((entry) => R.is(String, entry))

  const isArrayOfStringArrays = (data: unknown) =>
    Array.isArray(data) && data.every(isStringArray)

  return (
    R.is(Object, data) && R.propSatisfies(isArrayOfStringArrays, 'values', data)
  )
}
