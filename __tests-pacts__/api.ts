import { Matchers, Pact } from '@pact-foundation/pact'
import { createTestClient } from 'apollo-server-testing'
import * as path from 'path'
import rimraf from 'rimraf'
import * as util from 'util'

import { createGraphQLServer } from '../src/api'
import { gql } from 'apollo-server-cloudflare'

const rm = util.promisify(rimraf)

const root = path.join(__dirname, '..')
const pactDir = path.join(root, 'pacts')

const pact = new Pact({
  consumer: 'api.serlo.org',
  provider: 'serlo.org',
  port: 9009,
  dir: pactDir
})

const server = createGraphQLServer()
const client = createTestClient(server)

beforeAll(async () => {
  await rm(pactDir)
  await pact.setup()
})

afterEach(async () => {
  await pact.verify()
})

afterAll(async () => {
  await pact.finalize()
})

describe('Page', () => {
  test('by alias', async () => {
    await addAliasInteraction({
      request: '/mathe',
      response: {
        id: 19767,
        discriminator: 'page'
      }
    })
    const response = await client.query({
      query: gql`
        {
          uuid(alias: { instance: de, path: "/mathe" }) {
            __typename
            ... on Page {
              id
            }
          }
        }
      `
    })
    expect(response.errors).toBe(undefined)
    expect(response.data).toEqual({
      uuid: {
        __typename: 'Page',
        id: 19767
      }
    })
  })

  test('by id', async () => {
    await addUuidInteraction({
      request: 19767,
      response: {
        id: 19767,
        discriminator: 'page'
      }
    })
    const response = await client.query({
      query: gql`
        {
          uuid(id: 19767) {
            __typename
            ... on Page {
              id
            }
          }
        }
      `
    })
    expect(response.errors).toBe(undefined)
    expect(response.data).toEqual({
      uuid: {
        __typename: 'Page',
        id: 19767
      }
    })
  })
})

describe('Entity', () => {
  describe('Article', () => {
    test('by alias', async () => {
      await addAliasInteraction({
        request:
          '/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel',
        response: {
          id: 1855,
          discriminator: 'entity',
          type: 'article',
          instance: 'de',
          currentRevisionId: Matchers.integer(30674),
          licenseId: Matchers.integer(1)
        }
      })
      const response = await client.query({
        query: gql`
          {
            uuid(
              alias: {
                instance: de
                path: "/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel"
              }
            ) {
              __typename
              ... on Article {
                id
                instance
                currentRevision {
                  id
                }
                license {
                  id
                }
              }
            }
          }
        `
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Article',
          id: 1855,
          instance: 'de',
          currentRevision: {
            id: 30674
          },
          license: {
            id: 1
          }
        }
      })
    })

    test('by alias (w/ license)', async () => {
      await addAliasInteraction({
        request:
          '/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel',
        response: {
          id: 1855,
          discriminator: 'entity',
          type: 'article',
          instance: 'de',
          currentRevisionId: Matchers.integer(30674),
          licenseId: Matchers.integer(1)
        }
      })
      await pact.addInteraction({
        state: `1 is a license`,
        uponReceiving: `resolve license 1`,
        withRequest: {
          method: 'GET',
          path: '/api/license/1'
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            id: 1,
            instance: Matchers.string('de'),
            default: Matchers.boolean(true),
            title: Matchers.string('title'),
            url: Matchers.string('url'),
            content: Matchers.string('content'),
            agreement: Matchers.string('agreement'),
            iconHref: Matchers.string('iconHref')
          }
        }
      })
      const response = await client.query({
        query: gql`
          {
            uuid(
              alias: {
                instance: de
                path: "/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel"
              }
            ) {
              __typename
              ... on Article {
                id
                instance
                currentRevision {
                  id
                }
                license {
                  id
                  title
                }
              }
            }
          }
        `
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Article',
          id: 1855,
          instance: 'de',
          currentRevision: {
            id: 30674
          },
          license: {
            id: 1,
            title: 'title'
          }
        }
      })
    })

    test('by alias (w/ currentRevision)', async () => {
      await addAliasInteraction({
        request:
          '/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel',
        response: {
          id: 1855,
          discriminator: 'entity',
          type: 'article',
          instance: 'de',
          currentRevisionId: Matchers.integer(30674),
          licenseId: Matchers.integer(1)
        }
      })
      await addUuidInteraction({
        request: 30674,
        response: {
          id: 30674,
          discriminator: 'entityRevision',
          type: 'article',
          fields: {
            title: Matchers.string('title'),
            content: Matchers.string('content'),
            changes: Matchers.string('changes')
          }
        }
      })
      const response = await client.query({
        query: gql`
          {
            uuid(
              alias: {
                instance: de
                path: "/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel"
              }
            ) {
              __typename
              ... on Article {
                id
                instance
                currentRevision {
                  id
                  title
                  content
                  changes
                }
              }
            }
          }
        `
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Article',
          id: 1855,
          instance: 'de',
          currentRevision: {
            id: 30674,
            title: 'title',
            content: 'content',
            changes: 'changes'
          }
        }
      })
    })

    test('by id', async () => {
      await addUuidInteraction({
        request: 1855,
        response: {
          id: 1855,
          discriminator: 'entity',
          type: 'article',
          instance: 'de',
          currentRevisionId: 30674,
          licenseId: 1
        }
      })
      const response = await client.query({
        query: gql`
          {
            uuid(id: 1855) {
              __typename
              ... on Article {
                id
                instance
                currentRevision {
                  id
                }
                license {
                  id
                }
              }
            }
          }
        `
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Article',
          id: 1855,
          instance: 'de',
          currentRevision: {
            id: 30674
          },
          license: {
            id: 1
          }
        }
      })
    })
  })
})

describe('EntityRevision', () => {
  test('by id', async () => {
    await addUuidInteraction({
      request: 30674,
      response: {
        id: 30674,
        discriminator: 'entityRevision',
        type: 'article',
        fields: {
          title: Matchers.string('title'),
          content: Matchers.string('content'),
          changes: Matchers.string('changes')
        }
      }
    })
    const response = await client.query({
      query: gql`
        {
          uuid(id: 30674) {
            __typename
            ... on ArticleRevision {
              id
              title
              content
              changes
            }
          }
        }
      `
    })
    expect(response.errors).toBe(undefined)
    expect(response.data).toEqual({
      uuid: {
        __typename: 'ArticleRevision',
        id: 30674,
        title: 'title',
        content: 'content',
        changes: 'changes'
      }
    })
  })
})

test('License', async () => {
  await pact.addInteraction({
    state: `1 is a license`,
    uponReceiving: `resolve license 1`,
    withRequest: {
      method: 'GET',
      path: '/api/license/1'
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: {
        id: 1,
        instance: Matchers.string('de'),
        default: Matchers.boolean(true),
        title: Matchers.string('title'),
        url: Matchers.string('url'),
        content: Matchers.string('content'),
        agreement: Matchers.string('agreement'),
        iconHref: Matchers.string('iconHref')
      }
    }
  })
  const response = await client.query({
    query: gql`
      {
        license(id: 1) {
          id
          instance
          default
          title
          url
          content
          agreement
          iconHref
        }
      }
    `
  })
  expect(response.errors).toBe(undefined)
  expect(response.data).toEqual({
    license: {
      id: 1,
      instance: 'de',
      default: true,
      title: 'title',
      url: 'url',
      content: 'content',
      agreement: 'agreement',
      iconHref: 'iconHref'
    }
  })
})

async function addAliasInteraction<
  T extends { discriminator: string; id: number }
>(payload: { request: string; response: T }) {
  const { request, response } = payload
  await pact.addInteraction({
    state: `${request} is alias of (${response.discriminator}, ${response.id}) in instance de`,
    uponReceiving: `resolve de.serlo.org${request}`,
    withRequest: {
      method: 'GET',
      path: `/api/alias${request}`
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: response
    }
  })
}

async function addUuidInteraction<
  T extends { discriminator: string; id: number }
>(payload: { request: number; response: T }) {
  const { request, response } = payload
  await pact.addInteraction({
    state: `uuid ${request} is of discriminator ${response.discriminator}`,
    uponReceiving: `resolve uuid ${request}`,
    withRequest: {
      method: 'GET',
      path: `/api/uuid/${request}`
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: response
    }
  })
}
