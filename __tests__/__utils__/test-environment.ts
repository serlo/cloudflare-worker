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
import TOML from '@iarna/toml'
import fs from 'fs'
import { FetchError } from 'node-fetch'
import path from 'path'

import { handleRequest } from '../../src'
import { Variables } from '../../src/bindings'
import { isInstance } from '../../src/utils'

export function currentTestEnvironment(): TestEnvironment {
  const environment = (process.env.TEST_ENVIRONMENT ?? '').toLowerCase()

  return isRemoteEnvironmentName(environment)
    ? new RemoteEnvironment(environment)
    : new LocalEnvironment()
}

export function currentTestEnvironmentWhen(
  requirement: (config: Variables) => boolean
): TestEnvironment {
  const current = currentTestEnvironment()

  if (
    current instanceof RemoteEnvironment &&
    requirement(current.getConfig())
  ) {
    return current
  }

  return new LocalEnvironment()
}

export function localTestEnvironment() {
  return new LocalEnvironment()
}

abstract class TestEnvironment {
  public fetch(spec: UrlSpec, init?: RequestInit) {
    return this.fetchRequest(this.createRequest(spec, init))
  }

  public abstract fetchRequest(request: Request): Promise<Response>

  public createRequest(spec: UrlSpec, init?: RequestInit) {
    return new Request(this.createUrl(spec), init)
  }

  public createUrl({
    protocol = 'https',
    subdomain = '',
    pathname = '/',
  }: UrlSpec): string {
    return (
      protocol +
      '://' +
      subdomain +
      (subdomain.length > 0 ? '.' : '') +
      this.getDomain() +
      pathname
    )
  }

  public abstract getDomain(): string

  public getNeededTimeout(): number | null {
    return null
  }
}

export class LocalEnvironment extends TestEnvironment {
  public getDomain() {
    return global.DOMAIN
  }

  public fetchRequest(request: Request): Promise<Response> {
    return handleRequest(request)
  }
}

class RemoteEnvironment extends TestEnvironment {
  protected static config: Config

  public constructor(private name: RemoteEnvironmentName) {
    super()
  }

  public getDomain(): string {
    return this.getConfig().DOMAIN
  }

  public getConfig(): Variables {
    RemoteEnvironment.config =
      RemoteEnvironment.config ?? RemoteEnvironment.loadConfig()

    return RemoteEnvironment.config.env[this.name].vars
  }

  protected static loadConfig() {
    const rootDir = path.dirname(path.dirname(__dirname))
    const configFile = path.join(rootDir, 'wrangler.toml')
    const configContent = fs.readFileSync(configFile, 'utf8')

    return (TOML.parse(configContent) as unknown) as Config
  }

  public getNeededTimeout() {
    return 20000
  }

  public createRequest(spec: UrlSpec, init?: RequestInit) {
    const request = super.createRequest(spec, init)

    // See https://github.com/mswjs/msw/blob/master/src/context/fetch.ts
    request.headers.set('x-msw-bypass', 'true')

    if (this.name === 'staging' && isInstance(spec.subdomain)) {
      request.headers.set('Authorization', 'Basic c2VybG90ZWFtOnNlcmxvdGVhbQ==')
    }

    return request
  }

  public async fetchRequest(request: Request, retry = 0): Promise<Response> {
    try {
      return fetch(request, { redirect: 'manual' })
    } catch (error) {
      if (
        error instanceof FetchError &&
        /ECONNRESET/.test(error.message) &&
        retry < 2
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        return this.fetchRequest(request, retry + 1)
      }

      throw error
    }
  }
}

interface Config {
  env: {
    [Environment in RemoteEnvironmentName]: {
      vars: Variables
    }
  }
}

type RemoteEnvironmentName = 'staging' | 'production'

function isRemoteEnvironmentName(env: string): env is RemoteEnvironmentName {
  return env === 'staging' || env === 'production'
}

interface UrlSpec {
  subdomain?: string
  pathname?: string
  protocol?: 'http' | 'https'
}
