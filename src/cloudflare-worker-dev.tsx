import { h, VNode } from 'preact'

import { Maintenance } from './maintenance/template'
import { Template } from './ui'
import { createPreactResponse, Url } from './utils'

const basePath = '/___cloudflare_worker_dev'
const components: ComponentSpec[] = [
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
]

export function cloudflareWorkerDev(request: Request) {
  const pathname = Url.fromRequest(request).pathnameWithoutTrailingSlash

  if (!pathname.startsWith(basePath)) return null

  const subpath = pathname.substring(basePath.length)

  if (subpath === '' || subpath === '/') {
    return createIndexHtml()
  }

  const componentSpec = components.find(
    ({ subpath: componentSubpath }) => subpath === '/' + componentSubpath
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
    </Template>
  )
}

interface ComponentSpec {
  title: string
  subpath: string
  component: VNode
}
