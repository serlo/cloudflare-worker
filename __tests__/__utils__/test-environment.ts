import { CfProperties } from '@cloudflare/workers-types'
import TOML from '@iarna/toml'
import fs from 'fs'
import { bypass } from 'msw'
import path from 'path'
import { fileURLToPath } from 'url'

import { createKV } from './kv'
import cloudflareWorker from '../../src'
import { CFEnvironment, CFVariables } from '../../src/cf-environment'
import { isInstance } from '../../src/utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

declare global {
  // eslint-disable-next-line no-var
  var server: ReturnType<typeof import('msw/node').setupServer>
}

export function getDefaultCFEnvironment(): CFEnvironment & {
  waitForSeconds: (seconds: number) => void
} {
  let currentTime = 0

  return {
    API_ENDPOINT: 'https://api.serlo.org/graphql',
    ALLOW_AUTH_FROM_LOCALHOST: 'true',
    ENABLE_BASIC_AUTH: 'true',
    API_SECRET: 'secret',
    DOMAIN: 'serlo.localhost',
    ENVIRONMENT: 'local',
    FRONTEND_DOMAIN: 'frontend.serlo.localhost',
    SENTRY_DSN: 'https://public@127.0.0.1/0',

    PATH_INFO_KV: createKV(() => currentTime),
    waitForSeconds(seconds) {
      currentTime += seconds
    },
  }
}

export function currentTestEnvironment(): TestEnvironment {
  const environment = (process.env.TEST_ENVIRONMENT ?? '').toLowerCase()

  return isRemoteEnvironmentName(environment)
    ? new RemoteEnvironment(environment)
    : new LocalEnvironment()
}

export function currentTestEnvironmentWhen(
  requirement: (config: CFVariables) => boolean,
): TestEnvironment {
  const current = currentTestEnvironment()

  if (current instanceof RemoteEnvironment && current.fulfills(requirement)) {
    return current
  }

  return new LocalEnvironment()
}

export function localTestEnvironment() {
  return new LocalEnvironment()
}

export abstract class TestEnvironment {
  public cfEnv = getDefaultCFEnvironment()

  public fetch(spec: UrlSpec, init?: RequestInit) {
    return this.fetchRequest(this.createRequest(spec, init))
  }

  public abstract fetchRequest(request: Request): Promise<Response>

  public createRequest(spec: UrlSpec, init?: RequestInit<CfProperties>) {
    const request = new Request<unknown, CfProperties>(
      this.createUrl(spec),
      // CF worker has redirect set to "manual" as default value
      { redirect: 'manual', ...init },
    )

    if (init?.cf != null) {
      // @ts-expect-error We want to override `cf` here since setting it via `init` does not work
      request.cf = { ...init.cf }
    }

    return request
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
    return this.cfEnv.DOMAIN
  }

  public async fetchRequest(request: Request): Promise<Response> {
    const waitForPromises: Promise<unknown>[] = []

    const response = await cloudflareWorker.fetch(request, this.cfEnv, {
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

  public fulfills(predicate: (config: CFVariables) => boolean): boolean {
    return predicate(this.getConfig())
  }

  protected getConfig(): CFVariables {
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
    const request = super.createRequest(spec, { ...init, redirect: 'manual' })

    if (this.name === 'staging' && isInstance(spec.subdomain)) {
      request.headers.set('Authorization', 'Basic c2VybG90ZWFtOnNlcmxvdGVhbQ==')
    }

    return request
  }

  public async fetchRequest(request: Request, retry = 0): Promise<Response> {
    try {
      return fetch(bypass(request))
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
      vars: CFVariables
    }
  }
}

type RemoteEnvironmentName = Exclude<CFVariables['ENVIRONMENT'], 'local'>

function isRemoteEnvironmentName(env: string): env is RemoteEnvironmentName {
  return env === 'staging' || env === 'production'
}

interface UrlSpec {
  subdomain?: string
  pathname?: string
  protocol?: 'http' | 'https'
}
