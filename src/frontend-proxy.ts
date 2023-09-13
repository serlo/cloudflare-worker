import { CFEnvironment } from './cf-environment'
import {
  isInstance,
  SentryFactory,
  SentryReporter,
  Url,
  Instance,
} from './utils'

export async function frontendSpecialPaths(
  request: Request,
  sentryFactory: SentryFactory,
  env: CFEnvironment,
): Promise<Response | null> {
  const route = getRoute(request)
  const sentry = sentryFactory.createReporter('frontend-special-paths')

  return route !== null && route.__typename === 'BeforeRedirectsRoute'
    ? fetchBackend({ request, sentry, route: route.route, env })
    : null
}

export async function frontendProxy(
  request: Request,
  sentryFactory: SentryFactory,
  env: CFEnvironment,
): Promise<Response | null> {
  const sentry = sentryFactory.createReporter('frontend')
  const route = getRoute(request)

  return route !== null && route.__typename !== 'BeforeRedirectsRoute'
    ? fetchBackend({ request, sentry, route, env })
    : null
}

async function fetchBackend({
  request,
  sentry,
  route,
  env,
}: {
  request: Request
  sentry: SentryReporter
  route: FrontendRoute
  env: CFEnvironment
}) {
  const backendUrl = Url.fromRequest(request)

  if (route.__typename === 'Frontend') {
    if (backendUrl.hasContentApiParameters()) {
      backendUrl.pathname = '/content-only' + backendUrl.pathname
    }

    if (route.appendSubdomainToPath) {
      backendUrl.pathname = `/${backendUrl.subdomain}${backendUrl.pathname}`
    }

    backendUrl.hostname = env.FRONTEND_DOMAIN
    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }

  const response = await fetch(new Request(backendUrl.toString(), request), {
    redirect: route.__typename === 'Frontend' ? route.redirect : 'manual',
  })

  if (sentry) {
    if (route.__typename === 'Frontend' && response.status === 302) {
      sentry.setContext('backendUrl', backendUrl)
      sentry.setContext('location', response.headers.get('Location'))
      sentry.captureMessage('Frontend responded with a redirect', 'error')
    }
  }

  return new Response(response.body, response)
}

function getRoute(request: Request): RouteConfig | null {
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null

  if (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/oauth/') ||
    url.pathname.startsWith('/api/.ory/')
  ) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Frontend',
        redirect: 'manual',
        appendSubdomainToPath: false,
      },
    }
  }

  const subjectStartPages: { [I in Instance]?: string[] } = {
    de: [
      '/biologie',
      '/chemie',
      '/lerntipps',
      '/mathe',
      '/nachhaltigkeit',
      '/informatik',
    ],
  }

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_assets/') ||
    url.pathname.startsWith('/api/frontend/') ||
    url.pathname.startsWith('/___') ||
    url.pathname === '/user/notifications' ||
    url.pathname === '/consent' ||
    (subjectStartPages[url.subdomain] &&
      subjectStartPages[url.subdomain]?.includes(
        url.pathnameWithoutTrailingSlash,
      ))
  ) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Frontend',
        redirect: 'follow',
        appendSubdomainToPath: false,
      },
    }
  }

  return {
    __typename: 'Frontend',
    redirect: 'follow',
    appendSubdomainToPath: true,
  }
}

type RouteConfig = FrontendRoute | BeforeRedirectsRoute

interface BeforeRedirectsRoute {
  __typename: 'BeforeRedirectsRoute'
  route: FrontendRoute
}

interface FrontendRoute {
  __typename: 'Frontend'
  redirect: 'manual' | 'follow'
  appendSubdomainToPath: boolean
}
