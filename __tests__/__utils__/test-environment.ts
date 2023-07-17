import TOML from '@iarna/toml'
import fs from 'fs'
import path from 'path'

import { handleFetchEvent } from '../../src'
import { isInstance } from '../../src/utils'

declare global {
  // eslint-disable-next-line no-var
  var server: ReturnType<typeof import('msw/node').setupServer>
}

export function currentTestEnvironment(): TestEnvironment {
  const environment = (process.env.TEST_ENVIRONMENT ?? '').toLowerCase()

  return isRemoteEnvironmentName(environment)
    ? new RemoteEnvironment(environment)
    : new LocalEnvironment()
}

export function currentTestEnvironmentWhen(
  requirement: (config: Variables) => boolean,
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

export abstract class TestEnvironment {
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

class LocalEnvironment extends TestEnvironment {
  public getDomain() {
    return 'serlo.localhost'
  }

  public async fetchRequest(originalRequest: Request): Promise<Response> {
    // CF worker has redirect set to "manual" as default value
    const request = new Request(originalRequest, { redirect: 'manual' })
    const waitForPromises: Promise<unknown>[] = []

    const response = await handleFetchEvent(request, {
      waitUntil(promise: Promise<unknown>) {
        waitForPromises.push(promise)
      },
      // This is needed to match the shape of the ExecutionContext type.
      passThroughOnException() {},
    })

    await Promise.all(waitForPromises)

    return response
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

    return TOML.parse(configContent) as unknown as Config
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
        error instanceof Error &&
        /ECONNRESET/.test(error.message) &&
        retry < 3
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

type Variables = Pick<
  typeof global,
  'ENVIRONMENT' | 'ALLOW_AUTH_FROM_LOCALHOST' | 'DOMAIN'
>

type RemoteEnvironmentName = Exclude<typeof ENVIRONMENT, 'local'>

function isRemoteEnvironmentName(env: string): env is RemoteEnvironmentName {
  return env === 'staging' || env === 'production'
}

interface UrlSpec {
  subdomain?: string
  pathname?: string
  protocol?: 'http' | 'https'
}
