export function getSubdomain(url: string): string | null {
  const u = new URL(url)
  const hostnameParts = u.hostname.split('.')
  if (hostnameParts.length <= 2) return null
  return hostnameParts.splice(0, hostnameParts.length - 2).join('.')
}

export function getPathname(url: string): string {
  const u = new URL(url)
  return u.pathname
}

export function getPathnameWithoutTrailingSlash(url: string): string {
  const pathname = getPathname(url)
  return pathname.endsWith('/')
    ? pathname.substr(0, pathname.length - 1)
    : pathname
}
