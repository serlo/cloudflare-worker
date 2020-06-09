import { getPathname, getSubdomain } from './url-utils'
import { createJsonResponse } from './utils'

// See https://www.everythingfrontend.com/posts/newtype-in-typescript.html
type UserId = string & { readonly __tag: unique symbol }

interface Sheet {
  values: unknown[][]
}

export interface Options {
  spreadsheetId?: string
  apiKey?: string
}

export enum MajorDimension {
  Rows = 'ROWS',
  Columns = 'COLUMNS',
}

export async function handleRequest(
  req: Request,
  opt?: Options
): Promise<Response | null> {
  const url = req.url

  if (getSubdomain(url) !== 'api') return null
  if (getPathname(url) !== '/community/active-donors') return null

  const spreadsheetId =
    opt?.spreadsheetId ?? global.SPREADSHEET_ID_ACTIVE_DONORS
  const apiKey = opt?.apiKey ?? global.GOOGLE_API_KEY

  const sheet = await fetchSheet({
    spreadsheetId,
    range: 'Tabellenblatt1!A:A',
    key: apiKey,
    majorDimension: MajorDimension.Columns,
  })

  const userIds = sheet !== null ? extractUserIdsFromSheet(sheet) : null

  return createJsonResponse(userIds ?? [])
}

export async function fetchSheet({
  spreadsheetId,
  range,
  key = global.GOOGLE_API_KEY,
  majorDimension = MajorDimension.Rows,
}: {
  spreadsheetId: string
  range: string
  key?: string
  majorDimension?: MajorDimension
}): Promise<Sheet | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=${majorDimension}&key=${key}`
  const response = await fetch(url)
  let data

  try {
    data = await response.json()
  } catch (error) {
    return null
  }

  return to(isSheet, data)
}

export function extractUserIdsFromSheet(sheet: Sheet): UserId[] | null {
  const column = sheet !== null ? sheet.values[0].slice(1) : null
  const userIds =
    column !== null
      ? column.map((entry) => to(isUserId, entry)).filter(notEmpty)
      : null

  return userIds
}

export function to<A>(
  typeGuard: (value: unknown) => value is A,
  data: unknown
): A | null {
  return typeGuard(data) ? data : null
}

export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value != null
}

export function isSheet(data: unknown): data is Sheet {
  return (
    isObject(data) &&
    //@ts-ignore
    Array.isArray(data.values) &&
    //@ts-ignore
    Array.isArray(data.values[0]) &&
    //@ts-ignore
    data.values[0].length > 0
  )
}

export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && /^\d+$/.test(value)
}

function notEmpty<A>(value: A | null): value is A {
  return value != null
}
