import type { URLSearchParams } from '@cloudflare/workers-types'

const contentApiParameters = [
  'contentOnly',
  'hideTopbar',
  'hideLeftSidebar',
  'hideRightSidebar',
  'hideBreadcrumbs',
  'hideDiscussions',
  'hideBanner',
  'hideHorizon',
  'hideFooter',
  'fullWidth',
]

export class Url extends URL {
  public get subdomain(): string {
    return this.hostname.split('.').slice(0, -2).join('.')
  }

  public get domain(): string {
    return this.hostname.split('.').slice(-2).join('.')
  }

  public set subdomain(subdomain: string) {
    this.hostname = subdomain + (subdomain.length > 0 ? '.' : '') + this.domain
  }

  public get pathnameWithoutTrailingSlash(): string {
    return this.pathname.endsWith('/')
      ? this.pathname.slice(0, -1)
      : this.pathname
  }

  public hasContentApiParameters() {
    // FIXME: Somehow Typescript does not take the URLSearchParams definition
    // of `@cloudflare/worker-types`. This a a shaky workaround to make
    // Typescript happy.
    const params = this.searchParams as URLSearchParams

    return Array.from(params.keys()).some((key) =>
      contentApiParameters.includes(key),
    )
  }

  public toRedirect(status?: number) {
    return Response.redirect(this.toString(), status)
  }

  public static fromRequest(request: Request): Url {
    return new Url(request.url)
  }
}
