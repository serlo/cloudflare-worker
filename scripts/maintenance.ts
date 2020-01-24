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
import { spawnSync } from 'child_process'
import { DateTime } from 'luxon'

exec()

function exec() {
  if (process.argv.length <= 2) {
    console.error('Expecting command')
    process.exit(1)
  }
  const command = process.argv[2]
  switch (command) {
    case 'end':
      return endHandler()
    case 'schedule':
      return scheduleHandler()
    case 'status':
      return statusHandler()
  }
}

function endHandler() {
  console.log('Disabling maintenance mode')

  spawnSync(
    'yarn',
    ['wrangler', 'kv:key', 'delete', '--binding=MAINTENANCE_KV', 'start'],
    {
      stdio: 'inherit'
    }
  )
  spawnSync(
    'yarn',
    ['wrangler', 'kv:key', 'delete', '--binding=MAINTENANCE_KV', 'end'],
    {
      stdio: 'inherit'
    }
  )
}

function scheduleHandler() {
  if (process.argv.length <= 3 || process.argv.length > 5) {
    console.error('Wrong number of arguments')
    process.exit(1)
  }

  console.log('Scheduling maintenance mode')

  const start = process.argv[3]
  const end = process.argv[4]

  spawnSync(
    'yarn',
    [
      'wrangler',
      'kv:key',
      'put',
      '--binding=MAINTENANCE_KV',
      'start',
      `${parseDate(start).toISO()}`
    ],
    {
      stdio: 'inherit'
    }
  )

  if (!end) return
  spawnSync(
    'yarn',
    [
      'wrangler',
      'kv:key',
      'put',
      '--binding=MAINTENANCE_KV',
      'end',
      `${parseDate(end).toISO()}`
    ],
    {
      stdio: 'inherit'
    }
  )

  function parseDate(raw: string): DateTime {
    const now = DateTime.local()
    const match = raw.match(/(\d\d):(\d\d)/)
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
      millisecond: 0
    })
  }
}

function statusHandler() {
  console.log('Getting maintenance status')

  spawnSync(
    'yarn',
    ['wrangler', 'kv:key', 'get', '--binding=MAINTENANCE_KV', 'start'],
    {
      stdio: 'inherit'
    }
  )
  spawnSync(
    'yarn',
    ['wrangler', 'kv:key', 'get', '--binding=MAINTENANCE_KV', 'end'],
    {
      stdio: 'inherit'
    }
  )
}
