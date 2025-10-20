import { Url, isInstance } from './utils'

export function blockCommonHackerPaths(request: Request) {
  const url = Url.fromRequest(request)

  if (isInstance(url.subdomain)) {
    // Block common hacker paths with 404 response
    if (isCommonHackerPath(url.pathname)) {
      return new Response('Not Found', { status: 404 })
    }
  }

  return null
}

function isCommonHackerPath(path: string): boolean {
  const lowerPath = path.toLowerCase()

  // Common file-based attacks
  if (
    lowerPath.startsWith('/.env') ||
    lowerPath.startsWith('/.git') ||
    lowerPath.startsWith('/.aws') ||
    lowerPath.startsWith('/.ssh') ||
    lowerPath.startsWith('/.docker') ||
    lowerPath === '/config.json' ||
    lowerPath === '/config.php' ||
    lowerPath === '/configuration.php'
  ) {
    return true
  }

  // WordPress-related paths
  if (
    lowerPath.startsWith('/wp-admin') ||
    lowerPath.startsWith('/wp-login') ||
    lowerPath.startsWith('/wp-content') ||
    lowerPath.startsWith('/wp-includes') ||
    lowerPath === '/xmlrpc.php' ||
    lowerPath === '/wp-config.php'
  ) {
    return true
  }

  // Other CMS and admin panels
  if (
    lowerPath.startsWith('/phpmyadmin') ||
    lowerPath.startsWith('/pma') ||
    lowerPath.startsWith('/admin') ||
    lowerPath.startsWith('/administrator') ||
    lowerPath.startsWith('/cpanel') ||
    lowerPath.startsWith('/plesk') ||
    lowerPath.startsWith('/webmail') ||
    lowerPath.startsWith('/joomla') ||
    lowerPath.startsWith('/drupal')
  ) {
    return true
  }

  // Common file extensions that Serlo doesn't use
  if (
    lowerPath.endsWith('.php') ||
    lowerPath.endsWith('.asp') ||
    lowerPath.endsWith('.aspx') ||
    lowerPath.endsWith('.jsp') ||
    lowerPath.endsWith('.cgi') ||
    lowerPath.endsWith('.pl')
  ) {
    return true
  }

  return false
}
