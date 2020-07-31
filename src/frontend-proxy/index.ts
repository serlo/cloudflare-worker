import { fetchApi } from '../api'
import {
  getSubdomain,
  getPathname,
  hasContentApiParameters,
  getQueryString,
} from '../url-utils'
import { getCookieValue, isLanguageCode, LanguageCode } from '../utils'

export async function frontendProxy(
  request: Request
): Promise<Response | null> {
  const probability = Number(global.FRONTEND_PROBABILITY)
  const allowedTypes = JSON.parse(global.FRONTEND_ALLOWED_TYPES) as string[]

  const url = request.url
  const path = getPathname(url)
  const lang = getSubdomain(url)

  if (lang === null || !isLanguageCode(lang)) return null

  if (
    global.FRONTEND_PREPEND_LANGUAGE_CODE !== 'true' &&
    lang !== LanguageCode.De
  )
    return null

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
    const typename = await queryTypename(path)
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

  async function fetchBackend(useFrontend: boolean, lang: string) {
    const pathPrefix =
      global.FRONTEND_PREPEND_LANGUAGE_CODE === 'true' ? `/${lang}` : ''
    const backendUrl = useFrontend
      ? `https://${frontendDomain}${pathPrefix}${getPathname(request.url)}` +
        getQueryString(request.url)
      : request.url
    const response = await fetch(new Request(backendUrl, request))

    return new Response(response.body, response)
  }

  function setCookieUseFrontend(res: Response, useFrontend: number) {
    res.headers.append('Set-Cookie', `useFrontend=${useFrontend}; path=/`)
  }

  async function queryTypename(path: string): Promise<string | null> {
    if (path.startsWith('/user/profile/')) {
      return 'User'
    }

    const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get(path)
    if (cachedType !== null) return cachedType

    const apiResponse = await fetchApi(global.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: createApiQuery(path) }),
    })
    const apiResult = (await apiResponse.json()) as {
      data: {
        uuid: {
          __typename: string
        } | null
      } | null
    } | null
    const typename = apiResult?.data?.uuid?.__typename ?? null

    if (typename !== null)
      await global.FRONTEND_CACHE_TYPES_KV.put(path, typename, {
        expirationTtl: 60 * 60,
      })

    return typename
  }
}

export function createApiQuery(path: string): string {
  const query = /^\/\d+$/.test(path)
    ? `id: ${path.slice(1)}`
    : `alias: { instance: de, path: "${path}" }`

  return `{ uuid(${query}) { __typename } }`
}
