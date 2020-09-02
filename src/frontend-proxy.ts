import {
  getSubdomain,
  getPathname,
  hasContentApiParameters,
  getPathnameWithoutTrailingSlash,
} from './url-utils'
import { getCookieValue, isInstance, Instance, getPathInfo } from './utils'

export async function frontendProxy(
  request: Request
): Promise<Response | null> {
  const probability = Number(global.FRONTEND_PROBABILITY)
  const allowedTypes = JSON.parse(global.FRONTEND_ALLOWED_TYPES) as string[]
  const supportInternationalization =
    global.FRONTEND_SUPPORT_INTERNATIONALIZATION === 'true'

  const url = request.url
  const path = getPathname(url)
  const instance = getSubdomain(url)

  if (instance === null || !isInstance(instance)) return null

  if (!supportInternationalization && instance !== Instance.De) return null

  if (path === '/enable-frontend')
    return createConfigurationResponse('Enabled: Use of new frontend', 0)

  if (path === '/disable-frontend')
    return createConfigurationResponse('Disabled: Use of new frontend', 1)

  const cookies = request.headers.get('Cookie')
  const frontendDomain =
    getCookieValue('frontendDomain', cookies) ?? global.FRONTEND_DOMAIN

  if (
    path.startsWith('/_next/') ||
    path.startsWith('/_assets/') ||
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/frontend/')
  )
    return await fetchBackend({ useFrontend: true })

  if (
    path === '/auth/login' ||
    path === '/auth/logout' ||
    path.startsWith('/auth/activate/') ||
    path === '/auth/password/change' ||
    path.startsWith('/auth/password/restore/') ||
    path === '/auth/hydra/login' ||
    path === '/auth/hydra/consent' ||
    path === '/user/register' ||
    hasContentApiParameters(url) ||
    (global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND === 'true' &&
      getCookieValue('authenticated', cookies) === '1')
  )
    return await fetchBackend({ useFrontend: false })

  if (path === '/spenden') return await fetchBackend({ useFrontend: true })

  if (path !== '/' && path !== '/search') {
    const pathInfo = await getPathInfo(instance, path)
    const typename = pathInfo?.typename ?? null

    if (typename === null || !allowedTypes.includes(typename)) return null
  }

  const cookieValue = Number(getCookieValue('useFrontend', cookies) ?? 'NaN')
  const useFrontendNumber = Number.isNaN(cookieValue)
    ? Math.random()
    : cookieValue

  const response = await fetchBackend({
    useFrontend: useFrontendNumber <= probability,
    pathPrefix: instance,
  })
  if (Number.isNaN(cookieValue))
    setCookieUseFrontend(response, useFrontendNumber)

  return response

  async function fetchBackend({
    useFrontend,
    pathPrefix,
  }: {
    useFrontend: boolean
    pathPrefix?: Instance
  }) {
    const backendUrl = new URL(request.url)

    if (useFrontend) {
      backendUrl.hostname = frontendDomain

      if (supportInternationalization && pathPrefix !== undefined)
        backendUrl.pathname = `/${pathPrefix}${backendUrl.pathname}`

      backendUrl.pathname = getPathnameWithoutTrailingSlash(backendUrl.href)
    }

    const response = await fetch(new Request(backendUrl.href, request))

    return new Response(response.body, response)
  }

  function createConfigurationResponse(message: string, useFrontend: number) {
    const response = new Response(message)

    setCookieUseFrontend(response, useFrontend)
    response.headers.set('Refresh', '1; url=/')

    return response
  }

  function setCookieUseFrontend(res: Response, useFrontend: number) {
    res.headers.append(
      'Set-Cookie',
      `useFrontend=${useFrontend}; path=/; domain=.${global.DOMAIN}`
    )
  }
}
