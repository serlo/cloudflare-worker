import { h } from 'preact'

import { Maintenance } from './ui'
import { Url, createPreactResponse, getCookieValue } from './utils'

export function maintenanceMode(request: Request) {
  // Set manually to true, if you want maintenance mode.
  // We don't need to put this var in a KV. See https://github.com/serlo/cloudflare-worker/issues/415
  const enabled = false
  const bypassCookie = getCookieValue(
    'bypassMaintenance',
    request.headers.get('Cookie'),
  )

  if (!enabled || bypassCookie === '1') return null

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
