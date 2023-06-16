import { Instance } from '../../../src/utils'

declare global {
  // eslint-disable-next-line no-var
  var uuids: Uuid[]
}

export function givenUuid(uuid: Uuid) {
  globalThis.uuids.push(uuid)
}

export function getUuid(instance: string, path: string) {
  const regexes = [
    new RegExp('^/(?<id>\\d+)$'),
    new RegExp('(?<subject>[^/]+/)?(?<id>\\d+)/(?<title>[^/]*)$'),
  ]

  for (const regex of regexes) {
    const match = regex.exec(path)

    if (match) {
      const id = parseInt(match?.groups?.id ?? '')
      return globalThis.uuids.find((u) => u.id === id)
    }
  }

  return globalThis.uuids.find(
    (u) =>
      u.instance === instance &&
      [u.alias, u.oldAlias].includes(decodeURIComponent(path))
  )
}

export type Uuid = GenericUuid | Course | Solution

interface Course extends AbstractUuid<'Course'> {
  pages?: { alias: string }[]
}
interface Solution extends AbstractUuid<'Solution'> {
  exercise?: { alias: string }
}

interface GenericUuid extends AbstractUuid<GenericTypenames> {}

type GenericTypenames = 'Page' | 'Article' | 'TaxonomyTerm' | 'Comment'

interface AbstractUuid<Typename extends string> {
  __typename: Typename
  id?: number
  alias?: string
  oldAlias?: string
  instance?: Instance
  content?: string
  legacyObject?: { alias: string }
  trashed?: boolean
}
