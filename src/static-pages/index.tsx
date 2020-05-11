/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Fragment, h } from 'preact'

import { Template } from '../ui'
import { getPathnameWithoutTrailingSlash, getSubdomain } from '../url-utils'
import {
  createJsonResponse,
  createNotFoundResponse,
  createPreactResponse,
  fetchWithCache,
  isLanguageCode,
  LanguageCode,
  markdownToHtml,
  sanitizeHtml,
} from '../utils'
import {
  Config,
  revisedConfig as defaultRevisedConfig,
  RevisedConfig,
  RevisedSpec,
  RevisedType,
  Spec,
  titles,
  unrevisedConfig as defaultUnrevisedConfig,
  UnrevisedConfig,
  UnrevisedType,
} from './config'

const defaultLanguage = LanguageCode.En

export {
  RevisedType,
  UnrevisedType,
  Spec,
  RevisedSpec,
  UnrevisedConfig,
  RevisedConfig,
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
        return createJsonResponse(revisions.map((x) => x.revision))
      } else {
        return createNotFoundResponse()
      }
    }

    const archivedRegex = `^\\/${revisedType}\\/archive\\/(\\d{4}-\\d{2}-\\d{2})$`
    const archivedMatch = new RegExp(archivedRegex).exec(path)

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
      {page.isCurrentRevision ? null : (
        <div className="alert alert-info" style="margin-top: 20px;">
          {getAlert()}
        </div>
      )}
      <h1>
        {page.title} <small>{getSubHeader()}</small>
      </h1>
      {page.isCurrentRevision ? <p>{getArchiveDescription()}</p> : null}
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )

  function getAlert() {
    switch (page.lang) {
      case LanguageCode.De:
        return (
          <Fragment>
            Dies ist eine archivierte Version. Schaue Dir die{' '}
            <a href={`/${page.revisedType}`}>aktuelle Version</a> oder{' '}
            <a href={`/${page.revisedType}/archive`}>frühere Versionen</a> an.
          </Fragment>
        )
      case LanguageCode.En:
      default:
        return (
          <Fragment>
            This is an archived version. View the{' '}
            <a href={`/${page.revisedType}`}>current version</a> or{' '}
            <a href={`/${page.revisedType}/archive`}>all past versions</a>.
          </Fragment>
        )
    }
  }

  function getArchiveDescription() {
    switch (page.lang) {
      case LanguageCode.De:
        return (
          <Fragment>
            Frühere Versionen findest Du im{' '}
            <a href={`/${page.revisedType}/archive`}>Archiv</a>.
          </Fragment>
        )
      case LanguageCode.En:
      default:
        return (
          <Fragment>
            You can view past versions in the{' '}
            <a href={`/${page.revisedType}/archive`}>archive</a>.
          </Fragment>
        )
    }
  }

  function getSubHeader() {
    switch (page.lang) {
      case LanguageCode.De:
        return (
          <Fragment>
            wirksam ab dem {page.revisionDate.toLocaleDateString(page.lang)}
          </Fragment>
        )
      case LanguageCode.En:
      default:
        return (
          <Fragment>
            effective {page.revisionDate.toLocaleDateString(page.lang)}
          </Fragment>
        )
    }
  }
}

export function RevisionsOverview({ revisions }: { revisions: RevisedPage[] }) {
  const current = revisions[0]
  const title = getTitle()

  return (
    <Template title={title} lang={current.lang}>
      <h1>{title}</h1>
      <p>{getDescription()}</p>
      <ul>
        {revisions.map((rev) => {
          const link = `/${rev.revisedType}/archive/${rev.revision}`
          return (
            <li key={rev.revisionDate}>
              <a href={link}>{renderRevision(rev)}</a>
            </li>
          )
        })}
      </ul>
    </Template>
  )

  function getTitle() {
    switch (current.lang) {
      case LanguageCode.De:
        return `Aktualisierungen: ${current.title}`
      case LanguageCode.En:
      default:
        return `Updates: ${current.title}`
    }
  }

  function renderRevision(rev: RevisedPage) {
    switch (current.lang) {
      case LanguageCode.De:
        return (
          <Fragment>
            {rev.isCurrentRevision
              ? 'Aktuelle Version'
              : rev.revisionDate.toLocaleDateString(rev.lang)}
          </Fragment>
        )
      case LanguageCode.En:
      default:
        return (
          <Fragment>
            {rev.isCurrentRevision
              ? 'current version'
              : rev.revisionDate.toLocaleDateString(rev.lang)}
          </Fragment>
        )
    }
  }

  function getDescription() {
    switch (current.lang) {
      case LanguageCode.De:
        return <Fragment>Du findest hier frühere Versionen:</Fragment>
      case LanguageCode.En:
      default:
        return (
          <Fragment>In this archive, you can see all past versions:</Fragment>
        )
    }
  }
}

export async function fetchContent<A extends Page>(
  page: A
): Promise<WithContent<A> | null> {
  const response = await fetchWithCache(page.url)

  if (response.ok) {
    const text = await response.text()
    const rawContent = page.url.endsWith('.md') ? markdownToHtml(text) : text
    const sanitizedContent = sanitizeHtml(rawContent)
    const content = sanitizedContent
      .replace('JS-GOOGLE-ANALYTICS-DEACTIVATE', 'javascript:gaOptout();')
      // TODO: disabled until Matomo is live
      .replace('MATOMO-OPT-OUT-FORM', '')

    return { ...page, content }
  } else {
    return null
  }
}

export function findRevisionById<A extends RevisedSpec>(
  revisions: A[],
  id: string
): A | null {
  return revisions.find((x) => x.revision === id) ?? null
}

export function getRevisions(
  config: RevisedConfig,
  lang: LanguageCode,
  revisedType: RevisedType,
  getTitle: (revisedType: RevisedType) => string = (x) =>
    titles[x][lang] || titles[x][LanguageCode.En] || ''
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
        isCurrentRevision: index === 0,
      }
    })
  }
}

export function getPage(
  config: UnrevisedConfig,
  lang: LanguageCode,
  unrevisedType: UnrevisedType,
  getTitle: (unrevisedType: UnrevisedType) => string = (x) =>
    titles[x][lang] || titles[x][LanguageCode.En] || ''
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
