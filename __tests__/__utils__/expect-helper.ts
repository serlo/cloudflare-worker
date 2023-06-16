import { SeverityLevel } from '@sentry/types'

export async function expectContainsText(response: Response, texts: string[]) {
  expect(response).not.toBeNull()

  const responseText = await response.text()
  texts.forEach((text) =>
    expect(responseText).toEqual(expect.stringContaining(text))
  )
}

export function expectContentTypeIsHtml(response: Response): void {
  expect(response.headers.get('Content-Type')).toBe('text/html;charset=utf-8')
}

export async function expectIsNotFoundResponse(
  response: Response
): Promise<void> {
  expect(response.status).toBe(404)
  expect(await response.text()).toEqual(
    expect.stringContaining('Page not found')
  )
}

export async function expectIsJsonResponse(
  response: Response,
  targetJson: unknown
) {
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(JSON.parse(await response.text())).toEqual(targetJson)
}

export function expectToBeRedirectTo(
  response: Response,
  url: string,
  status: number
) {
  expect(response.status).toBe(status)
  expect(response.headers.get('Location')).toBe(url)
}

export function expectSentryEvent({
  message,
  level,
  error,
  service,
  tags = {},
  context,
}: {
  message?: string
  level?: SeverityLevel
  error?: string
  service?: string
  tags?: Record<string, string | number | boolean>
  context?: Record<string, unknown>
}) {
  const finalTags = { ...tags, ...(service ? { service } : {}) }

  expect(globalThis.sentryEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ...(level ? { level } : error ? { level: 'error' } : {}),
        ...(message ? { message } : {}),
        ...(error
          ? {
              exception: {
                values: expect.arrayContaining([
                  expect.objectContaining({ value: error }) as unknown,
                ]) as unknown,
              },
            }
          : {}),
        ...(Object.keys(finalTags).length > 0
          ? { tags: expect.objectContaining(finalTags) as unknown }
          : {}),
        ...(context
          ? {
              extra: {
                context: expect.objectContaining(context) as unknown,
              },
            }
          : {}),
      }),
    ])
  )
}

export function expectNoSentryError() {
  expect(globalThis.sentryEvents).toHaveLength(0)
}
