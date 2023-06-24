import { DateTime } from 'luxon'
import { h, VNode } from 'preact'

import { UnrevisedPage, RevisedPage, RevisionsOverview } from './legal-pages'
import { Template, NotFound } from './ui'
import { Maintenance } from './ui/maintenance'
import { createPreactResponse, Url, Instance } from './utils'

const loremIpsum = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam
varius nisl in eros finibus commodo. Quisque fringilla nulla varius, porttitor
diam vitae, maximus nibh. Etiam ornar faucibus ante, eu rutrum mauris.</p>
<h2>Term 1</h2>
<p>Sed sed nibh facilisis massa gravida consequat et in ex. Sed ac molestie ant.
Vestibulum eu finibus metus. Morbi posuere, mi veq semper consequat, metus nibh
tincidunt dui, at congue tellus nun sit amet felis. Mauris sodales euismod
turpis sit amet tristi que.</p>`
const end = DateTime.local().plus({ hour: 1 })
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
    component: <Maintenance lang="en" end={end} />,
  },
  {
    title: 'Maintenance Template (German; with end date)',
    subpath: 'maintenance-de-with-end-date',
    component: <Maintenance lang="de" end={end} />,
  },
  {
    title: 'Unrevised page',
    subpath: 'unrevised-page',
    component: (
      <UnrevisedPage
        page={{
          lang: Instance.En,
          title: 'Imprint',
          url: '',
          content: loremIpsum,
        }}
      />
    ),
  },
  {
    title: 'Current revised page',
    subpath: 'current-revised-page',
    component: (
      <RevisedPage
        page={{
          lang: Instance.En,
          revision: '2020-01-10',
          revisionDate: new Date('2020-01-10'),
          title: 'Privacy',
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: true,
          content: loremIpsum,
        }}
      />
    ),
  },
  {
    title: 'Archived revised page',
    subpath: 'archived-revised-page',
    component: (
      <RevisedPage
        page={{
          lang: Instance.En,
          revision: '2020-01-10',
          revisionDate: new Date('2020-01-10'),
          title: 'Privacy',
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: false,
          content: loremIpsum,
        }}
      />
    ),
  },
  {
    title: 'Revisions Overview',
    subpath: 'revisions-overview',
    component: (
      <RevisionsOverview
        revisions={[
          {
            revision: '2020-01-10',
            revisionDate: new Date('2020-01-10'),
            title: 'Privacy',
            lang: Instance.En,
            url: '',
            revisedType: 'privacy',
            isCurrentRevision: true,
          },
          {
            revision: '2010-12-13',
            revisionDate: new Date('2010-12-13'),
            title: 'Privacy',
            lang: Instance.En,
            url: '',
            revisedType: 'privacy',
            isCurrentRevision: false,
          },
          {
            revision: '1999-02-23',
            revisionDate: new Date('1999-02-23'),
            title: 'Privacy',
            lang: Instance.En,
            url: '',
            revisedType: 'privacy',
            isCurrentRevision: false,
          },
        ]}
      />
    ),
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
