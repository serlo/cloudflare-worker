/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { DateTime } from 'luxon'

exec()

function exec() {
  if (process.argv.length <= 2) {
    console.error('Expecting date')
    process.exit(1)
  }

  const date = process.argv[2]
  console.log(parseDate(date).toISO())

  function parseDate(raw: string): DateTime {
    const now = DateTime.local()
    const match = /(\d\d):(\d\d)/.exec(raw)
    if (!match) {
      console.error(`Couldn't parse ${raw}`)
      process.exit(1)
    }
    const hour = parseInt(match[1], 10)
    const minute = parseInt(match[2], 10)
    return now.set({
      hour: hour,
      minute: minute,
      second: 0,
      millisecond: 0,
    })
  }
}
