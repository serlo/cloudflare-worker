/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2022 Serlo Education e.V.
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

export function createKV<K extends string = string>(): KVNamespace<K> {
  const values = {} as Record<K, string | undefined>
  return {
    get(key: K, options?: unknown) {
      if (options !== undefined) {
        throw new Error(
          'get function for type ${options.type} not yet implemented'
        )
      }

      return Promise.resolve(values[key] ?? null)
    },
    getWithMetadata(_key: unknown, _options: unknown) {
      throw new Error('not implemented')
    },
    list(_options) {
      throw new Error('not implemented')
    },
    delete(_name) {
      throw new Error('not implemented')
    },
    put(key, value: string, _) {
      if (key.length > 512) {
        throw new Error('Error: key longer than 512 characters.')
      }
      values[key] = value

      return Promise.resolve(undefined)
    },
  } as KVNamespace<K>
}
