import { getSubdomain, getPathname, hasContentApiParameters } from './url-utils'
import {
  getCookieValue,
  isLanguageCode,
  LanguageCode,
  getPathInfo,
} from './utils'

export async function frontendProxy(
  request: Request
): Promise<Response | null> {
  const probability = Number(global.FRONTEND_PROBABILITY)
  const allowedTypes = JSON.parse(global.FRONTEND_ALLOWED_TYPES) as string[]
  const supportInternationalization =
    global.FRONTEND_SUPPORT_INTERNATIONALIZATION === 'true'

  const url = request.url
  const path = getPathname(url)
  const lang = getSubdomain(url)

  if (lang === null || !isLanguageCode(lang)) return null

  if (!supportInternationalization && lang !== LanguageCode.De) return null

  if (path === '/enable-frontend') {
    const response = new Response('Enabled: Use of new frontend')

    setCookieUseFrontend(response, 0)

    return response
  }

  if (path === '/disable-frontend') {
    const response = new Response('Disabled: Use of new frontend')

    setCookieUseFrontend(response, 1)

    return response
  }

  const cookies = request.headers.get('Cookie')
  const frontendDomain =
    getCookieValue('frontendDomain', cookies) ?? global.FRONTEND_DOMAIN

  if (
    path.startsWith('/_next/') ||
    path.startsWith('/_assets/') ||
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/frontend/') ||
    path === '/search' ||
    path === '/spenden'
  )
    return await fetchBackend(true, lang)

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
    return await fetchBackend(false, lang)

  if (path !== '/') {
    const pathInfo = await getPathInfo(lang, path)
    const typename = pathInfo?.typename ?? null

    if (typename === null || !allowedTypes.includes(typename)) return null
  }

  const cookieValue = Number(getCookieValue('useFrontend', cookies) ?? 'NaN')
  const useFrontendNumber = Number.isNaN(cookieValue)
    ? Math.random()
    : cookieValue

  const response = await fetchBackend(useFrontendNumber <= probability, lang)
  if (Number.isNaN(cookieValue))
    setCookieUseFrontend(response, useFrontendNumber)

  return response

  async function fetchBackend(useFrontend: boolean, lang: LanguageCode) {
    const backendUrl = new URL(request.url)

    if (useFrontend) {
      backendUrl.hostname = frontendDomain

      if (supportInternationalization)
        backendUrl.pathname = `/${lang}${backendUrl.pathname}`
    }

    const response = await fetch(new Request(backendUrl.href, request))

    return new Response(response.body, response)
  }

  function setCookieUseFrontend(res: Response, useFrontend: number) {
    res.headers.append('Set-Cookie', `useFrontend=${useFrontend}; path=/`)
  }
}
