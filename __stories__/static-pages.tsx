import { h } from 'preact'
import {
  UnrevisedPage as UnrevisedPageOriginal,
  RevisedPage as RevisedPageOriginal,
  RevisionsOverview as RevisionsOverviewOriginal
} from '../src/static-pages'
import { createStaticComponent } from './utils'

const UnrevisedPage = createStaticComponent(UnrevisedPageOriginal)
const RevisedPage = createStaticComponent(RevisedPageOriginal)
const RevisionsOverview = createStaticComponent(RevisionsOverviewOriginal)

export default {
  title: 'static-pages'
}

const content = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam
varius nisl in eros finibus commodo. Quisque fringilla nulla varius, porttitor
diam vitae, maximus nibh. Etiam ornar faucibus ante, eu rutrum mauris.</p>
<h2>Term 1</h2>
<p>Sed sed nibh facilisis massa gravida consequat et in ex. Sed ac molestie ant.
Vestibulum eu finibus metus. Morbi posuere, mi veq semper consequat, metus nibh
tincidunt dui, at congue tellus nun sit amet felis. Mauris sodales euismod
turpis sit amet tristi que.</p>`

export function ExampleUnrevisedPage() {
  return <UnrevisedPage page={{
    lang: 'en',
    title: 'Imprint',
    url: '',
    content
  }}/>
}

export function ExampleCurrentRevisedPage() {
  return <RevisedPage page={{
    lang: 'en',
    revision: new Date(2020, 0, 10),
    title: 'Privacy',
    url: '',
    revisedType: 'privacy',
    isCurrentRevision: true,
    content
  }} />
}

export function ExampleArchivedRevisedPage() {
  return <RevisedPage page={{
    lang: 'en',
    revision: new Date(2020, 0, 10),
    title: 'Privacy',
    url: '',
    revisedType: 'privacy',
    isCurrentRevision: false,
    content
  }}/>
}

export function ExampleRevisionsOverview() {
  return <RevisionsOverview revisions={[
    {
      revision: new Date(2020, 1, 3),
      title: 'Privacy',
      lang: 'en',
      url: '',
      revisedType: 'privacy',
      isCurrentRevision: true
    },
    {
      revision: new Date(1999, 11, 7),
      title: 'Privacy',
      lang: 'en',
      url: '',
      revisedType: 'privacy',
      isCurrentRevision: false
    },
    {
      revision: new Date(1987, 4, 5),
      title: 'Privacy',
      lang: 'en',
      url: '',
      revisedType: 'privacy',
      isCurrentRevision: false
    }
  ]} />
}
