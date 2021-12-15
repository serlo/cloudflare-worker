/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { h, ComponentType, RenderableProps } from 'preact'
import renderToString from 'preact-render-to-string'

export function createStaticComponent<P = {}>(Component: ComponentType<P>) {
  return function StaticComponent(props: RenderableProps<P>) {
    const html = renderToString(<Component {...props} />)

    return (
      <div
        dangerouslySetInnerHTML={{
          __html: `<style>#root { height: 100%; }</style>${html}`,
        }}
        style="height: 100%"
      />
    )
  }
}
