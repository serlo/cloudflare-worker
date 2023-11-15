import { h, VNode } from 'preact'

import { Template, NotFound, Maintenance } from './ui'
import { createPreactResponse, Url } from './utils'

const basePath = '/___cloudflare_worker_dev'
const components: ComponentSpec[] = [
  {
    title: '404 Page',
    subpath: '404',
    component: <NotFound />,
  },
  {
    title: 'Maintenance Template (English)',
    subpath: 'maintenance-en',
    component: <Maintenance lang="en" />,
  },
  {
    title: 'Maintenance Template (German)',
    subpath: 'maintenance-de',
    component: <Maintenance lang="de" />,
  },
  {
    title: 'Maintenance Template (English; with end date)',
    subpath: 'maintenance-en-with-end-date',
    component: <Maintenance lang="en" end={new Date()} />,
  },
  {
    title: 'Maintenance Template (German; with end date)',
    subpath: 'maintenance-de-with-end-date',
    component: <Maintenance lang="de" end={new Date()} />,
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
    ? createPreactResponse(componentSpec.component)
    : null
}

function createIndexHtml() {
  const listHtml = components.map(({ title, subpath }, index) => {
    return (
      <li key={index}>
        <a href={`${basePath}/${subpath}`}>{title}</a>
      </li>
    )
  })

  return createPreactResponse(
    <Template lang="en" title="Serlo Cloudflare Worker: Preview of components">
      <ul>{listHtml}</ul>
    </Template>,
  )
}

interface ComponentSpec {
  title: string
  subpath: string
  component: VNode
}
