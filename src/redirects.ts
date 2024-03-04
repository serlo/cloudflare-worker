import { CFEnvironment } from './cf-environment'
import { getPathInfo, Instance, isInstance, Url } from './utils'

const meetRedirects: Record<string, string | undefined> = {
  '/': 'vtk-ncrc-rdp',
  '/dev': 'btp-tdvb-rzz',
  '/ansprache': 'pwr-bbca-hru',
  '/einbindung': 'qzv-ojgk-xqw',
  '/begleitung': 'kon-wdmt-yhb',
  '/reviewing': 'kon-wdmt-yhb',
  '/klausurtagung': 'bwn-wrqe-qtm',
  '/labschool': 'cvd-pame-zod',
  '/lenabi': 'hfe-apbh-apq',
  '/fundraising': 'uus-vjgu-ttr',
  '/maxsimon': 'jbx-bjba-qjh',
  '/hochschulmathe': 'oud-dpuy-swx',
  '/lamatreffen': 'unm-jesz-ibj',
  '/plenum': 'unm-jesz-ibj',
  '/party': 'fho-mbdm-gtv',
  '/1': 'fxn-iprp-ezx',
  '/2': 'yku-aksd-fkk',
  '/3': 'qma-zouf-vcz',
  '/4': 'ynr-brkr-vds',
  '/5': 'xqt-cdpm-nco',
  '/6': 'sui-yuwv-suh',
}

export async function redirects(request: Request, env: CFEnvironment) {
  const url = Url.fromRequest(request)

  if (url.subdomain === 'start') {
    return Response.redirect(
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301,
    )
  }

  if (isInstance(url.subdomain) && url.subdomain === Instance.De) {
    switch (url.pathname) {
      case '/datenschutz':
        return Response.redirect('https://de.serlo.org/privacy', 301)
      case '/impressum':
      case '/imprint':
        return Response.redirect('https://de.serlo.org/legal', 301)
      case '/nutzungsbedingungen':
      case '/21654':
      case '/21654/nutzungsbedingungen-und-urheberrecht':
        return Response.redirect('https://de.serlo.org/terms', 301)
    }
  }

  if (url.pathnameWithoutTrailingSlash === '/organization') {
    return Response.redirect('https://de.serlo.org/serlo', 301)
  }

  if (
    (!isInstance(url.subdomain) || url.subdomain !== Instance.En) &&
    url.pathnameWithoutTrailingSlash === '/editor'
  ) {
    return Response.redirect('https://en.serlo.org/editor', 301)
  }

  switch (url.pathnameWithoutTrailingSlash) {
    case '/ecec':
      return Response.redirect(
        'https://docs.google.com/document/d/1qSbyzDnW2RU58a7J3NHHBFo_MptaW-Ke0iT_c4KOhUA',
        302,
      )
    case '/chancenwerk':
      return Response.redirect(
        'https://de.serlo.org/mathe/268835/chancenwerk',
        302,
      )
  }

  // To avoid cycles, add redirects to lenabi.serlo.org only.
  if (
    url.subdomain === 'lenabi' &&
    ['production', 'local'].includes(env.ENVIRONMENT)
  ) {
    switch (url.pathnameWithoutTrailingSlash) {
      case '/metadata-api':
        return Response.redirect('https://de.serlo.org/metadata', 302)
      case '/data-wallet':
        return Response.redirect('https://lenabi.serlo-staging.dev/wallet', 302)
      case '/user-journey':
        return Response.redirect(
          'https://frontend-git-lenabi-mock-serlo.vercel.app/',
          302,
        )
      case '/sso':
        return Response.redirect('https://lenabi.serlo-staging.dev/sso', 302)
      case '/status':
        return Response.redirect(
          'https://frontend-git-lenabi-flow-serlo.vercel.app/___lenabi_status',
          302,
        )
      case '/docs':
        return Response.redirect(
          'https://github.com/serlo/lenabi-konzeptionsphase',
          302,
        )
      case '/docs/sso':
        return Response.redirect(
          'https://github.com/serlo/lenabi-konzeptionsphase/wiki/Implementierung-der-Prototypen#sso',
          302,
        )
    }
  }

  if (url.subdomain === 'meet') {
    const meetRedirect = meetRedirects[url.pathname]
    const redirectUrl = meetRedirect
      ? `https://meet.google.com/${meetRedirect}`
      : 'https://serlo.org/___cf_not_found'
    return Response.redirect(redirectUrl, 302)
  }

  if (url.subdomain === 'labschool') {
    url.subdomain = 'de'
    url.pathname = '/75578/serlo-in-der-schule'
    return url.toRedirect(301)
  }

  if (
    isInstance(url.subdomain) &&
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/labschool'
  ) {
    url.pathname = '/75578/serlo-in-der-schule'
    return url.toRedirect(301)
  }

  if (
    isInstance(url.subdomain) &&
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/hochschule'
  ) {
    url.pathname = '/mathe/universitaet/44323'
    return url.toRedirect(301)
  }

  if (
    isInstance(url.subdomain) &&
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/neuerechtsform'
  ) {
    return Response.redirect(
      'https://drive.google.com/file/d/1G3w2EIXlqvwuZ8LMzsYUjoMf9NbXoDIX/view',
      302,
    )
  }

  if (
    isInstance(url.subdomain) &&
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/beitreten'
  ) {
    return Response.redirect(
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
      301,
    )
  }

  if (isInstance(url.subdomain) && url.pathname === '/user/public') {
    url.pathname = '/user/me'
    return url.toRedirect(301)
  }

  if (url.subdomain === 'www' || url.subdomain === '') {
    if (url.pathname === '/global') {
      url.subdomain = Instance.En
      return url.toRedirect(301)
    }

    url.subdomain = Instance.De
    return url.toRedirect(301)
  }

  if (isInstance(url.subdomain)) {
    const regexes = [
      // See https://github.com/serlo/serlo.org-cloudflare-worker/issues/184
      // Can be deleted after a while after the /entity/view/<id>/toc route
      // got deleted
      /^\/entity\/view\/(\d+)\/toc$/,
      /^\/page\/view\/(\d+)$/,
      /^\/ref\/(\d+)$/,
    ]

    for (const regex of regexes) {
      const match = regex.exec(url.pathname)

      if (match) {
        url.pathname = `/${match[1]}`

        return url.toRedirect(301)
      }
    }
  }

  if (isInstance(url.subdomain)) {
    // support for legacy links to comment that are still used in mails
    // `/discussion/{id}`
    // can be deleted after we move the mailings
    const match = /^\/discussion\/(\d+)$/.exec(url.pathname)
    if (match) {
      url.pathname = `/${match[1]}`
      return url.toRedirect(301)
    }
  }

  if (isInstance(url.subdomain)) {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname, env)

    if (pathInfo !== null) {
      const newUrl = new Url(url.href)
      const { currentPath, instance, hash } = pathInfo

      if (instance && isInstance(instance) && url.subdomain !== instance)
        newUrl.subdomain = instance
      if (url.pathname !== currentPath) newUrl.pathname = currentPath
      if (hash !== undefined) newUrl.hash = hash

      if (newUrl.href !== url.href) return newUrl.toRedirect(301)
    }
  }

  if (
    isInstance(url.subdomain) &&
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/mathe-pruefungen'
  ) {
    const regionSlug =
      request.cf?.regionCode === 'NI' ? 'niedersachsen' : 'bayern'
    url.pathname = `/mathe-pruefungen/${regionSlug}`
    return url.toRedirect(302)
  }
}
