import { h } from 'preact'
import {
  UnrevisedPage as UnrevisedPageOriginal,
  RevisedPage as RevisedPageOriginal,
  RevisionsOverview as RevisionsOverviewOriginal,
} from '../src/static-pages'
import { LanguageCode } from '../src/utils'
import { createStaticComponent } from './utils'

const UnrevisedPage = createStaticComponent(UnrevisedPageOriginal)
const RevisedPage = createStaticComponent(RevisedPageOriginal)
const RevisionsOverview = createStaticComponent(RevisionsOverviewOriginal)

export default {
  title: 'static-pages',
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
  return (
    <UnrevisedPage
      page={{
        lang: LanguageCode.En,
        title: 'Imprint',
        url: '',
        content,
      }}
    />
  )
}

export function ExampleCurrentRevisedPage() {
  return (
    <RevisedPage
      page={{
        lang: LanguageCode.En,
        revision: '2020-01-10',
        revisionDate: new Date('2020-01-10'),
        title: 'Privacy',
        url: '',
        revisedType: 'privacy',
        isCurrentRevision: true,
        content,
      }}
    />
  )
}

export function ExampleArchivedRevisedPage() {
  return (
    <RevisedPage
      page={{
        lang: LanguageCode.En,
        revision: '2020-01-10',
        revisionDate: new Date('2020-01-10'),
        title: 'Privacy',
        url: '',
        revisedType: 'privacy',
        isCurrentRevision: false,
        content,
      }}
    />
  )
}

export function ExampleRevisionsOverview() {
  return (
    <RevisionsOverview
      revisions={[
        {
          revision: '2020-01-10',
          revisionDate: new Date('2020-01-10'),
          title: 'Privacy',
          lang: LanguageCode.En,
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: true,
        },
        {
          revision: '2010-12-13',
          revisionDate: new Date('2010-12-13'),
          title: 'Privacy',
          lang: LanguageCode.En,
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: false,
        },
        {
          revision: '1999-02-23',
          revisionDate: new Date('1999-02-23'),
          title: 'Privacy',
          lang: LanguageCode.En,
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: false,
        },
      ]}
    />
  )
}
