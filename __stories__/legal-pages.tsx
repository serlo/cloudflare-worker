/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021-2022 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { h } from 'preact'

import {
  UnrevisedPage as UnrevisedPageOriginal,
  RevisedPage as RevisedPageOriginal,
  RevisionsOverview as RevisionsOverviewOriginal,
} from '../src/legal-pages'
import { Instance } from '../src/utils'
import { createStaticComponent } from './utils'

const UnrevisedPage = createStaticComponent(UnrevisedPageOriginal)
const RevisedPage = createStaticComponent(RevisedPageOriginal)
const RevisionsOverview = createStaticComponent(RevisionsOverviewOriginal)

// eslint-disable-next-line import/no-default-export
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
        lang: Instance.En,
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
        lang: Instance.En,
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
        lang: Instance.En,
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
  )
}
