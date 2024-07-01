import { http, HttpResponse, JsonBodyType, ResponseResolver } from 'msw'

import { localTestEnvironment } from '../test-environment'

export function mockHttpGet(url: string, resolver: ResponseResolver) {
  globalThis.server.use(
    http.get(url, (info) => {
      if (info.request.url.toString() !== url) {
        return new Response('Bad Request: Query string does not match', {
          status: 400,
        })
      }

      return resolver(info)
    }),
  )
}

export function returnsText(body: string): ResponseResolver {
  return (_) => new Response(body)
}

export function returnsMalformedJson(): ResponseResolver {
  return (_) => new Response('malformed json')
}

export function returnsJson(data: JsonBodyType): ResponseResolver {
  return (_) => HttpResponse.json(data)
}

export function hasInternalServerError(): ResponseResolver {
  return (_) => new Response('', { status: 500 })
}

export function redirectsTo(location: string): ResponseResolver {
  return (_) => Response.redirect(location, 302)
}

export function badRequest(body: string) {
  return new Response(body, { status: 400 })
}

export function responseWithContentType(contentType: string) {
  new Response('', { headers: { 'content-type': contentType } })
}

export function createUrlRegex({
  subdomains,
  pathname = /\/.*/,
}: {
  subdomains: string[]
  pathname?: RegExp | string
}): RegExp {
  return new RegExp(
    'https:\\/\\/' +
      matchStrings(subdomains) +
      '\\.' +
      // TODO: Remove "serlo.org"
      matchStrings([localTestEnvironment().getDomain(), 'serlo.org']) +
      (typeof pathname === 'string' ? escapeRegex(pathname) : pathname.source),
  )
}

function matchStrings(strings: string[]) {
  return '(' + strings.map(escapeRegex).join('|') + ')'
}

function escapeRegex(text: string): string {
  // https://stackoverflow.com/a/3561711
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}
