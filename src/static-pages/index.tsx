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
  unrevisedConfig as defaultUnrevisedConfig,
  revisedConfig as defaultRevisedConfig
} from './config'

const defaultLanguage: LanguageCode = 'en'

export enum UnrevisedType {
  Imprint = 'imprint',
  TermsOfUse = 'terms'
}

export enum RevisedType {
  Privacy = 'privacy'
}

export interface SpecBase {
  title: string
  url: string
}

export interface Spec extends SpecBase {
  lang: LanguageCode
}

export interface Page {
  lang: LanguageCode
  title: string
  content: string
}

export type Revised<A extends object> = A & { revision: Date }

export type UnrevisedConfig = Config<UnrevisedType, SpecBase>
export type RevisedConfig = Config<RevisedType, Revised<SpecBase>[]>

type Config<A extends string, B> = {
  readonly [K1 in LanguageCode]?: {
    [K2 in A]?: B
  }
}

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

  for (const unrevisedType of Object.values(UnrevisedType)) {
    if (path === `/${unrevisedType}`) {
      const spec = getSpec(unrevisedConfig, lang, unrevisedType)
      const page = spec === null ? null : await getPage(spec)

      if (page !== null) {
        // TODO: Refactor to func
        return new Response(renderToString(UnrevisedPageView(page)))
      } else {
        // TODO: Refactor to external func
        // TODO: Better Look And Feel
        return new Response('Page not Found', { status: 404 })
      }
    }
  }

  for (const revisedType of Object.values(RevisedType)) {
    if (path === `/${revisedType}/json`) {
      const revisions = getRevisions(revisedConfig, lang, revisedType)

      if (revisions !== null) {
        return new Response(JSON.stringify(revisions.map(getRevisionId)))
      } else {
        return new Response('Page not Found', { status: 404 })
      }
    }
  }

  return null
}

export function UnrevisedPageView(page: Page) {
  return (
    <Template title={page.title} lang={page.lang}>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )
}

export function RevisedPageView(page: Revised<Page>) {
  return (
    <Template title={page.title} lang={page.lang}>
      <h1>
        {page.title}{' '}
        <small>({page.revision.toLocaleDateString(page.lang)})</small>
      </h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </Template>
  )
}

export async function getPage(spec: Spec): Promise<Page | null> {
  const response = await fetch(new Request(spec.url))

  if (response.ok) {
    const text = await response.text()
    const content = spec.url.endsWith('.md') ? markdownToHtml(text) : text

    return {
      lang: spec.lang,
      title: spec.title,
      content: sanitizeHtml(content)
    }
  } else {
    return null
  }
}

export function getRevisionId<A extends object>(revised: Revised<A>): string {
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
  revisedType: RevisedType
): Revised<Spec>[] | null {
  const result = getSpecBaseAndLanguage(config, lang, revisedType)

  if (result === null) {
    return null
  } else {
    const [revisions, lang] = result

    return revisions.map(revision => mapRevised(x => toSpec(x, lang), revision))
  }
}

export function getSpec(
  config: UnrevisedConfig,
  lang: LanguageCode,
  unrevisedType: UnrevisedType
): Spec | null {
  const result = getSpecBaseAndLanguage(config, lang, unrevisedType)

  return result === null ? null : toSpec(result[0], result[1])
}

export function mapRevised<A extends object, B extends object>(
  func: (x: A) => B,
  arg: Revised<A>
): Revised<B> {
  return { ...func(arg), revision: arg.revision }
}

function toSpec(base: SpecBase, lang: LanguageCode): Spec {
  return { ...base, lang }
}

function getSpecBaseAndLanguage<A extends string, B>(
  config: Config<A, B>,
  lang: LanguageCode,
  kind: A
): [B, LanguageCode] | null {
  // See https://stackoverflow.com/q/60400208 why the typecast is necessary
  const result = config[lang]?.[kind] as B | undefined

  if (result !== undefined && (!Array.isArray(result) || result.length > 0)) {
    return [result, lang]
  } else if (lang !== defaultLanguage) {
    return getSpecBaseAndLanguage(config, defaultLanguage, kind)
  } else {
    return null
  }
}
