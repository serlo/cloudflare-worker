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
  isLanguageCode,
  createPreactResponse,
  createJsonResponse,
  createNotFoundResponse,
  fetchWithCache
} from '../utils'
import { getPathnameWithoutTrailingSlash, getSubdomain } from '../url-utils'
import { Template } from '../ui'
import { h } from 'preact'
import {
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

const defaultLanguage = LanguageCode.En

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
  isCurrentRevision: boolean
  revisionDate: Date
  revisedType: string
}

export type WithContent<A extends Spec> = A & { content: string }

export async function handleRequest(
  request: Request,
  unrevisedConfig = defaultUnrevisedConfig,
  revisedConfig = defaultRevisedConfig
): Promise<Response | null> {
  const lang = getSubdomain(request.url)

  if (lang === null) return null
  if (!isLanguageCode(lang)) return null

  const path = getPathnameWithoutTrailingSlash(request.url)

  for (const unrevisedType of Object.values(UnrevisedType)) {
    if (path === `/${unrevisedType}`) {
      const spec = getPage(unrevisedConfig, lang, unrevisedType)
      const page = spec === null ? null : await fetchContent(spec)

      if (page !== null) {
        return createPreactResponse(<UnrevisedPage page={page} />)
      } else {
        return createNotFoundResponse()
      }
    }
  }

  for (const revisedType of Object.values(RevisedType)) {
    if (path === `/${revisedType}/json`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)

      if (revisions !== null) {
        return createJsonResponse(revisions.map(x => x.revision))
      } else {
        return createNotFoundResponse()
      }
    }

    const archivedRegex = `^\\/${revisedType}\\/archive\\/(\\d{4}-\\d{2}-\\d{2})$`
    const archivedMatch = path.match(new RegExp(archivedRegex))

    if (archivedMatch) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)
      const archived =
        revisions === null
          ? null
          : findRevisionById(revisions, archivedMatch[1])
      const page = archived === null ? null : await fetchContent(archived)

      if (page !== null) {
        return createPreactResponse(<RevisedPage page={page} />)
      } else {
        return createNotFoundResponse()
      }
    }

    if (path === `/${revisedType}/archive`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)

      if (revisions !== null) {
        return createPreactResponse(<RevisionsOverview revisions={revisions} />)
      } else {
        return createNotFoundResponse()
      }
    }

    if (path === `/${revisedType}`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)
      const current = revisions === null ? null : revisions[0]
      const page = current === null ? null : await fetchContent(current)

      if (page !== null) {
        return createPreactResponse(<RevisedPage page={page} />)
      } else {
        return createNotFoundResponse()
      }
    }
  }

  return null
}

export function UnrevisedPage({ page }: { page: WithContent<Page> }) {
  return (
    <Template title={page.title} lang={page.lang}>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )
}

export function RevisedPage({ page }: { page: WithContent<RevisedPage> }) {
  return (
    <Template title={page.title} lang={page.lang}>
      <h1>
        {page.title}{' '}
        <small>
          ({page.isCurrentRevision ? 'Current' : 'Archived'}
          {' version of '}
          {page.revisionDate.toLocaleDateString(page.lang)})
        </small>
      </h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )
}

export function RevisionsOverview({ revisions }: { revisions: RevisedPage[] }) {
  const current = revisions[0]
  const title = `Versions: ${current.title}`

  return (
    <Template title={title} lang={current.lang}>
      <h1>{title}</h1>
      There are the following archived versions of {current.title} available:
      <ul>
        {revisions.map(rev => {
          const link = `/${rev.revisedType}/archive/${rev.revision}`

          return (
            <li>
              <a href={link}>
                {rev.revisionDate.toLocaleDateString(rev.lang)}
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
  const response = await fetchWithCache(page.url)

  if (response.ok) {
    const text = await response.text()
    const rawContent = page.url.endsWith('.md') ? markdownToHtml(text) : text
    const sanitizedContent = sanitizeHtml(rawContent)
    const content = sanitizedContent.replace(
      '__JS_GOOGLE_ANALYTICS_DEACTIVATE__',
      'javascript:gaOptout();'
    )

    return { ...page, content }
  } else {
    return null
  }
}

export function findRevisionById<A extends RevisedSpec>(
  revisions: A[],
  id: string
): A | null {
  return revisions.find(x => x.revision === id) ?? null
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
    const { spec, lang } = result

    return spec.map((revision, index) => {
      return {
        ...revision,
        lang,
        title: getTitle(revisedType),
        revisionDate: new Date(revision.revision),
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
    : { ...result.spec, lang: result.lang, title: getTitle(unrevisedType) }
}

function getSpecAndLanguage<A extends string, B>(
  config: Config<A, B>,
  lang: LanguageCode,
  kind: A
): { spec: B; lang: LanguageCode } | null {
  // See https://stackoverflow.com/q/60400208 why the typecast is necessary
  const result = config[lang]?.[kind] as B | undefined

  if (result !== undefined && (!Array.isArray(result) || result.length > 0)) {
    return { spec: result, lang }
  } else if (lang !== defaultLanguage) {
    return getSpecAndLanguage(config, defaultLanguage, kind)
  } else {
    return null
  }
}
