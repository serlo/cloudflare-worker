import { h } from 'preact'

import { Maintenance } from './ui'
import { Url, createPreactResponse, getCookieValue } from './utils'

export function maintenanceMode(request: Request) {
  const bypassCookie = getCookieValue(
    'bypassMaintenance',
    request.headers.get('Cookie'),
  )

  if (bypassCookie === '1') return null

  const url = Url.fromRequest(request)

  return createMaintenanceResponse({ lang: getLanguage() })

  function getLanguage() {
    return ['', 'de', 'www'].includes(url.subdomain) ? 'de' : 'en'
  }
}

function createMaintenanceResponse({ lang }: { lang: 'de' | 'en' }) {
  return createPreactResponse(<Maintenance lang={lang} />, {
    status: 503,
  })
}
