import { hasContentApiParameters } from './url-utils'
import { Url, getCookieValue, isInstance, Instance, getPathInfo } from './utils'

export async function frontendProxy(
  request: Request
): Promise<Response | null> {
  const probability = Number(global.FRONTEND_PROBABILITY)
  const allowedTypes = JSON.parse(global.FRONTEND_ALLOWED_TYPES) as string[]
  const supportInternationalization =
    global.FRONTEND_SUPPORT_INTERNATIONALIZATION === 'true'
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null

  if (!supportInternationalization && url.subdomain !== Instance.De) return null

  if (url.pathname === '/enable-frontend')
    return createConfigurationResponse('Enabled: Use of new frontend', 0)

  if (url.pathname === '/disable-frontend')
    return createConfigurationResponse('Disabled: Use of new frontend', 1)

  const cookies = request.headers.get('Cookie')
  const frontendDomain =
    getCookieValue('frontendDomain', cookies) ?? global.FRONTEND_DOMAIN

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_assets/') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/frontend/')
  )
    return await fetchBackend({ useFrontend: true })

  if (
    url.pathname.startsWith('/auth/activate/') ||
    url.pathname.startsWith('/auth/password/restore/') ||
    [
      '/auth/login',
      '/auth/logout',
      '/auth/password/change',
      '/auth/hydra/login',
      '/auth/hydra/consent',
      '/user/register',
    ].includes(url.pathname) ||
    hasContentApiParameters(url.toString()) ||
    (global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND === 'true' &&
      getCookieValue('authenticated', cookies) === '1')
  )
    return await fetchBackend({ useFrontend: false })

  if (url.pathname === '/spenden')
    return await fetchBackend({ useFrontend: true })

  if (url.pathname !== '/' && url.pathname !== '/search') {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname)
    const typename = pathInfo?.typename ?? null

    if (typename === null || !allowedTypes.includes(typename)) return null
  }

  const cookieValue = Number(getCookieValue('useFrontend', cookies) ?? 'NaN')
  const useFrontendNumber = Number.isNaN(cookieValue)
    ? Math.random()
    : cookieValue

  const response = await fetchBackend({
    useFrontend: useFrontendNumber <= probability,
    pathPrefix: url.subdomain,
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
    const backendUrl = new Url(url.href)

    if (useFrontend) {
      backendUrl.hostname = frontendDomain

      if (supportInternationalization && pathPrefix !== undefined)
        backendUrl.pathname = `/${pathPrefix}${backendUrl.pathname}`

      backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
    }

    const response = await fetch(new Request(backendUrl.toString(), request))

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
