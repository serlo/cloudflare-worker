import { getMaintenanceHtml, wrapInTemplate, Url } from './utils'

const basePath = '/___cloudflare_worker_dev'
const components = [
  {
    title: 'Maintenance Template (English)',
    subpath: 'maintenance-en',
    component: getMaintenanceHtml({ lang: 'en' }),
  },
  {
    title: 'Maintenance Template (German)',
    subpath: 'maintenance-de',
    component: getMaintenanceHtml({ lang: 'de' }),
  },
  {
    title: 'Maintenance Template (English; with end date)',
    subpath: 'maintenance-en-with-end-date',
    component: getMaintenanceHtml({ lang: 'en', end: new Date() }),
  },
  {
    title: 'Maintenance Template (German; with end date)',
    subpath: 'maintenance-de-with-end-date',
    component: getMaintenanceHtml({ lang: 'de', end: new Date() }),
  },
]

export function cloudflareWorkerDev(request: Request) {
  const pathname = Url.fromRequest(request).pathnameWithoutTrailingSlash

  if (!pathname.startsWith(basePath)) return null

  const subpath = pathname.substring(basePath.length)

  if (subpath === '' || subpath === '/') {
    return createIndexHtml()
  }

  const componentSpec = components.find(
    ({ subpath: componentSubpath }) => subpath === '/' + componentSubpath,
  )

  return componentSpec != null
    ? createHtmlResponse(componentSpec.component)
    : null
}

function createIndexHtml() {
  const listHtml = components
    .map(({ title, subpath }) => {
      return `<li><a href="${basePath}/${subpath}">${title}</a></li>`
    })
    .join('')

  return createHtmlResponse(
    wrapInTemplate({
      title: 'Serlo Cloudflare Worker: Preview of components',
      lang: 'en',
      content: `<ul>${listHtml}</ul>`,
    }),
  )
}

function createHtmlResponse(html: string, opt?: ResponseInit) {
  return new Response(html, {
    ...opt,
    headers: {
      ...opt?.headers,
      'Content-Type': 'text/html;charset=utf-8',
    },
  })
}
