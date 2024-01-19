import { Url } from './utils'

export async function semanticFileNames(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'assets') return null

  url.host = 'assets.serlo.org'

  const re = /^\/(legacy\/|)((?!legacy)[\w-]+)\/([\w\-+]+)\.(\w+)$/
  const match = re.exec(url.pathname)

  if (!url.pathname.startsWith('/meta') && match) {
    const prefix = match[1]
    const hash = match[2]
    const extension = match[4]

    url.pathname = `${prefix}${hash}.${extension}`
  }
  return await fetch(url.href, request)
}
