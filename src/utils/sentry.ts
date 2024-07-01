import { Toucan } from 'toucan-js'

import { CFEnvironment } from './cf-environment'

export class SentryFactory {
  constructor(
    private env: CFEnvironment,
    private executionContext: ExecutionContext,
  ) {}

  createReporter(service: string) {
    return new SentryReporter(this.env, this.executionContext, service)
  }
}

export class SentryReporter {
  private context: Record<string, unknown>
  private tags: Array<[string, string | number | boolean]>
  private toucan?: Toucan

  constructor(
    private env: CFEnvironment,
    private executionContext: ExecutionContext,
    private service: string,
  ) {
    this.context = {}
    this.tags = []
  }

  setContext(key: string, value: unknown) {
    this.context[key] = value
  }

  setTag(key: string, value: string | number | boolean) {
    this.tags.push([key, value])
  }

  captureMessage(message: string, level: 'error' | 'warning' | 'info') {
    this.getToucan().captureMessage(message, level)
  }

  captureException(err: unknown) {
    this.getToucan().captureException(err)
  }

  private getToucan() {
    this.toucan ??= new Toucan({
      dsn: this.env.SENTRY_DSN,
      context: this.executionContext,
      environment: this.env.ENVIRONMENT,
      normalizeDepth: 5,
    })

    this.toucan.setTag('service', this.service)

    if (Object.keys(this.context).length > 0) {
      this.toucan.setExtra('context', this.context)
    }

    for (const [key, value] of this.tags) {
      this.toucan.setTag(key, value)
    }

    return this.toucan
  }
}

export function responseToContext({
  response,
  text,
  json,
}: {
  response: Response
  text?: string
  json?: unknown
}) {
  const headers = {} as Record<string, string>

  response.headers.forEach((key, value) => {
    headers[key] = value
  })

  return {
    status: response.status,
    url: response.url,
    headers,
    ...(text ? { text } : {}),
    ...(json ? { json } : {}),
  }
}
