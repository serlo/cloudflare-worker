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

  public toRedirect(status: 301 | 302) {
    return Response.redirect(this.toString(), status)
  }

  // This avoids type errors in the case there are differen incompatible type
  // definitions for `Request` (we only need the `url` parameter of the
  // `request` object anyways).
  //
  // See also https://github.com/cloudflare/workerd/issues/1298
  public static fromRequest(request: { url: string }): Url {
    return new Url(request.url)
  }
}
