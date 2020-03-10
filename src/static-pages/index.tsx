/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import {
  sanitizeHtml,
  markdownToHtml,
  LanguageCode,
  isLanguageCode
} from '../utils'
import { getPathnameWithoutTrailingSlash } from '../url-utils'
import { Template } from '../ui'
import renderToString from 'preact-render-to-string'
import { h } from 'preact'
import {
  ALL_UNREVISED_TYPES,
  ALL_REVSIED_TYPES,
  UnrevisedType,
  RevisedType,
  Spec,
  RevisedSpec,
  unrevisedConfig as defaultUnrevisedConfig,
  revisedConfig as defaultRevisedConfig,
  UnrevisedConfig,
  RevisedConfig,
  Config,
  titles
} from './config'

const defaultLanguage: LanguageCode = 'en'

export {
  RevisedType,
  UnrevisedType,
  Spec,
  RevisedSpec,
  UnrevisedConfig,
  RevisedConfig
} from './config'

export interface Page extends Spec {
  title: string
  lang: LanguageCode
}

export interface RevisedPage extends Page, RevisedSpec {
  revisedType: string
  isCurrentRevision: boolean
}

export type WithContent<A extends Spec> = A & { content: string }

export async function handleRequest(
  request: Request,
  unrevisedConfig = defaultUnrevisedConfig,
  revisedConfig = defaultRevisedConfig
): Promise<Response | null> {
  const hostnameParts = new URL(request.url).hostname.split('.')

  if (hostnameParts.length !== 3) return null
  const [lang, secondLevelDomain, topLevelDomain] = hostnameParts

  if (topLevelDomain !== 'org') return null
  if (secondLevelDomain !== 'serlo') return null
  if (!isLanguageCode(lang)) return null

  const path = getPathnameWithoutTrailingSlash(request.url)

  for (const unrevisedType of ALL_UNREVISED_TYPES) {
    if (path === `/${unrevisedType}`) {
      const spec = getPage(unrevisedConfig, lang, unrevisedType)
      const page = spec === null ? null : await fetchContent(spec)

      if (page !== null) {
        // TODO: Refactor to func
        return new Response(renderToString(UnrevisedPage(page)))
      } else {
        // TODO: Refactor to external func
        // TODO: Better Look And Feel
        return new Response('Page not Found', { status: 404 })
      }
    }
  }

  for (const revisedType of ALL_REVSIED_TYPES) {
    if (path === `/${revisedType}/json`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)

      if (revisions !== null) {
        return new Response(JSON.stringify(revisions.map(getRevisionId)))
      } else {
        return new Response('Page not Found', { status: 404 })
      }
    }

    const archivedRegex = `^\\/${revisedType}\\/archiv\\/(\\d{4}-\\d{2}-\\d{2})$`
    const archivedMatch = path.match(new RegExp(archivedRegex))

    if (archivedMatch) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)
      const archived =
        revisions === null
          ? null
          : findRevisionById(revisions, archivedMatch[1])
      const page = archived === null ? null : await fetchContent(archived)

      if (page !== null) {
        return new Response(renderToString(RevisedPage(page)))
      } else {
        return new Response('Page not Found', { status: 404 })
      }
    }

    if (path === `/${revisedType}/archiv`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)

      if (revisions !== null) {
        return new Response(renderToString(RevisionsOverview(revisions)))
      } else {
        return new Response('Page not Found', { status: 404 })
      }
    }

    if (path === `/${revisedType}`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)
      const current = revisions === null ? null : revisions[0]
      const page = current === null ? null : await fetchContent(current)

      if (page !== null) {
        return new Response(renderToString(RevisedPage(page)))
      } else {
        return new Response('Page not Found', { status: 404 })
      }
    }
  }

  return null
}

export function UnrevisedPage(page: WithContent<Page>) {
  return (
    <Template title={page.title} lang={page.lang}>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )
}

export function RevisedPage(page: WithContent<RevisedPage>) {
  return (
    <Template title={page.title} lang={page.lang}>
      <h1>
        {page.title}{' '}
        <small>
          ({page.isCurrentRevision ? 'Current' : 'Archived'}
          {' version of '}
          {page.revision.toLocaleDateString(page.lang)})
        </small>
      </h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )
}

export function RevisionsOverview(revisions: RevisedPage[]) {
  const current = revisions[0]
  const title = `Versions: ${current.title}`

  return (
    <Template title={title} lang={current.lang}>
      <h1>{title}</h1>
      There are the following archived versions of {current.title} available:
      <ul>
        {revisions.map(rev => {
          const link = `/${rev.revisedType}/archiv/${getRevisionId(rev)}`

          return (
            <li>
              <a href={link}>
                {rev.revision.toLocaleDateString(rev.lang)}
                {rev.isCurrentRevision ? ' (current version)' : ''}
              </a>
            </li>
          )
        })}
      </ul>
    </Template>
  )
}

export async function fetchContent<A extends Page>(
  page: A
): Promise<WithContent<A> | null> {
  const response = await fetch(new Request(page.url))

  if (response.ok) {
    const text = await response.text()
    const content = page.url.endsWith('.md') ? markdownToHtml(text) : text

    return {
      ...page,
      content: sanitizeHtml(content)
    }
  } else {
    return null
  }
}

export function findRevisionById<A extends RevisedSpec>(
  revisions: A[],
  id: string
): A | null {
  return revisions.find(x => getRevisionId(x) === id) ?? null
}

export function getRevisionId(revised: RevisedSpec): string {
  const year = revised.revision.getFullYear()
  const month = revised.revision.getMonth() + 1
  const day = revised.revision.getDate()

  const paddedMonth = month.toString().padStart(2, '0')
  const paddedDay = day.toString().padStart(2, '0')

  return `${year}-${paddedMonth}-${paddedDay}`
}

export function getRevisions(
  config: RevisedConfig,
  lang: LanguageCode,
  revisedType: RevisedType,
  getTitle: (revisedType: RevisedType) => string = x => titles[x]
): RevisedPage[] | null {
  const result = getSpecAndLanguage(config, lang, revisedType)

  if (result === null) {
    return null
  } else {
    const [revisions, lang] = result

    return revisions.map((revision, index) => {
      return {
        ...revision,
        lang,
        title: getTitle(revisedType),
        revisedType: revisedType,
        isCurrentRevision: index === 0
      }
    })
  }
}

export function getPage(
  config: UnrevisedConfig,
  lang: LanguageCode,
  unrevisedType: UnrevisedType,
  getTitle: (unrevisedType: UnrevisedType) => string = x => titles[x]
): Page | null {
  const result = getSpecAndLanguage(config, lang, unrevisedType)

  return result === null
    ? null
    : { ...result[0], lang: result[1], title: getTitle(unrevisedType) }
}

function getSpecAndLanguage<A extends string, B>(
  config: Config<A, B>,
  lang: LanguageCode,
  kind: A
): [B, LanguageCode] | null {
  // See https://stackoverflow.com/q/60400208 why the typecast is necessary
  const result = config[lang]?.[kind] as B | undefined

  if (result !== undefined && (!Array.isArray(result) || result.length > 0)) {
    return [result, lang]
  } else if (lang !== defaultLanguage) {
    return getSpecAndLanguage(config, defaultLanguage, kind)
  } else {
    return null
  }
}
