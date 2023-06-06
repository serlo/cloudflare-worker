import { DateTime } from 'luxon'
import { h } from 'preact'

import { Maintenance } from './template'
import { createPreactResponse, Url } from '../utils'

export async function maintenanceMode(request: Request) {
  const url = Url.fromRequest(request)
  const enabled = await globalThis.MAINTENANCE_KV.get('enabled')
  if (!enabled) return null
  const {
    start: startISO,
    end: endISO,
    subdomains = [],
  } = JSON.parse(enabled) as {
    start: string
    end: string
    subdomains?: string[]
  }
  if (!subdomains.includes(url.subdomain)) return null
  if (!startISO) return null
  const now = DateTime.local()
  const start = DateTime.fromISO(startISO)
  if (now < start) return null
  if (endISO) {
    const end = DateTime.fromISO(endISO)
    if (now > end) return null
    return createMaintenanceResponse({ lang: getLanguage(), end })
  }
  return createMaintenanceResponse({ lang: getLanguage() })

  function getLanguage() {
    return ['', 'de', 'www'].includes(url.subdomain) ? 'de' : 'en'
  }
}

function createMaintenanceResponse({
  lang,
  end,
}: {
  lang: 'de' | 'en'
  end?: DateTime
}) {
  return createPreactResponse(<Maintenance lang={lang} end={end} />, {
    status: 503,
    headers: end ? { 'Retry-After': end.toHTTP() } : {},
  })
}
