import {
  rest,
  ResponseResolver,
  restContext,
  DefaultBodyType,
  RestRequest,
} from 'msw'

export type RestResolver<
  RequestBodyType extends DefaultBodyType = DefaultBodyType
> = ResponseResolver<RestRequest<RequestBodyType>, typeof restContext>

export function mockHttpGet(url: string, resolver: RestResolver) {
  globalThis.server.use(
    rest.get(url, (req, res, ctx) => {
      if (req.url.toString() !== url)
        return res(ctx.status(400, 'Bad Request: Query string does not match'))

      return resolver(req, res, ctx)
    })
  )
}

export function returnsText(body: string): RestResolver {
  return (_req, res, ctx) => res.once(ctx.body(body))
}

export function returnsMalformedJson(): RestResolver {
  return (_req, res, ctx) => res(ctx.body('malformed json'))
}

export function returnsJson(data: unknown): RestResolver {
  return (_req, res, ctx) => res(ctx.json(data as any))
}

export function hasInternalServerError(): RestResolver {
  return (_req, res, ctx) => res(ctx.status(500))
}

export function redirectsTo(location: string): RestResolver {
  return (_req, res, ctx) => res(ctx.set('Location', location), ctx.status(302))
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
      matchStrings([globalThis.DOMAIN, 'serlo.org']) +
      (typeof pathname === 'string' ? escapeRegex(pathname) : pathname.source)
  )
}

function matchStrings(strings: string[]) {
  return '(' + strings.map(escapeRegex).join('|') + ')'
}

function escapeRegex(text: string): string {
  // https://stackoverflow.com/a/3561711
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}
