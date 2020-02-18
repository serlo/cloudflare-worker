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
import { StaticPagesConfig, LanguageCode } from './config'
import { sanitizeHtml, markdownToHtml } from '../utils'
import { Template } from '../ui'
import { h } from 'preact'

export enum Type {
  Imprint = 'imprint',
  TermsOfUse = 'terms'
}

export interface Spec {
  lang: LanguageCode
  title: string
  url: string
}

export interface Page {
  lang: LanguageCode
  title: string
  content: string
}

export function StaticPageView(page: Page) {
  return (
    <Template title={page.title} lang={page.lang}>
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

export function getSpec(
  config: StaticPagesConfig,
  lang: LanguageCode,
  pageType: Type
): Spec | null {
  const result = config[lang]?.staticPages?.[pageType]

  if (result !== undefined) {
    return { ...result, lang }
  } else if (lang !== 'en') {
    return getSpec(config, 'en', pageType)
  } else {
    return null
  }
}
