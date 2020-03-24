/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Matchers, Pact } from '@pact-foundation/pact'
import { gql } from 'apollo-server-cloudflare'
import { createTestClient } from 'apollo-server-testing'
import * as path from 'path'
import rimraf from 'rimraf'
import * as util from 'util'

import { createGraphQLServer } from '../src/api'

const rm = util.promisify(rimraf)

const root = path.join(__dirname, '..')
const pactDir = path.join(root, 'pacts')

const pact = new Pact({
  consumer: 'api.serlo.org',
  provider: 'serlo.org',
  port: 9009,
  dir: pactDir,
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

test('License', async () => {
  await addLicenseInteraction()
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
    `,
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
      iconHref: 'iconHref',
    },
  })
})

describe('Uuid', () => {
  describe('Entity', () => {
    describe('Article', () => {
      test('by alias', async () => {
        await addArticleAliasInteraction()
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
          `,
        })
        expect(response.errors).toBe(undefined)
        expect(response.data).toEqual({
          uuid: {
            __typename: 'Article',
            id: 1855,
            instance: 'de',
            currentRevision: {
              id: 30674,
            },
            license: {
              id: 1,
            },
          },
        })
      })

      test('by alias (w/ license)', async () => {
        await addArticleAliasInteraction()
        await addLicenseInteraction()
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
          `,
        })
        expect(response.errors).toBe(undefined)
        expect(response.data).toEqual({
          uuid: {
            __typename: 'Article',
            id: 1855,
            instance: 'de',
            currentRevision: {
              id: 30674,
            },
            license: {
              id: 1,
              title: 'title',
            },
          },
        })
      })

      test('by alias (w/ currentRevision)', async () => {
        await addArticleAliasInteraction()
        await addArticleRevisionInteraction()
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
          `,
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
              changes: 'changes',
            },
          },
        })
      })

      test('by id', async () => {
        await addArticleUuidInteraction()
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
          `,
        })
        expect(response.errors).toBe(undefined)
        expect(response.data).toEqual({
          uuid: {
            __typename: 'Article',
            id: 1855,
            instance: 'de',
            currentRevision: {
              id: 30674,
            },
            license: {
              id: 1,
            },
          },
        })
      })
    })
  })

  describe('EntityRevision', () => {
    describe('ArticleRevision', () => {
      test('by id', async () => {
        await addArticleRevisionInteraction()
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
                  article {
                    id
                  }
                }
              }
            }
          `,
        })
        expect(response.errors).toBe(undefined)
        expect(response.data).toEqual({
          uuid: {
            __typename: 'ArticleRevision',
            id: 30674,
            title: 'title',
            content: 'content',
            changes: 'changes',
            article: {
              id: 1855,
            },
          },
        })
      })

      test('by id (w/ article)', async () => {
        await addArticleRevisionInteraction()
        await addArticleUuidInteraction()
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
                  article {
                    id
                    currentRevision {
                      id
                    }
                  }
                }
              }
            }
          `,
        })
        expect(response.errors).toBe(undefined)
        expect(response.data).toEqual({
          uuid: {
            __typename: 'ArticleRevision',
            id: 30674,
            title: 'title',
            content: 'content',
            changes: 'changes',
            article: {
              id: 1855,
              currentRevision: {
                id: 30674,
              },
            },
          },
        })
      })
    })
  })

  describe('Page', () => {
    test('by alias', async () => {
      await addPageAliasInteraction()
      const response = await client.query({
        query: gql`
          {
            uuid(alias: { instance: de, path: "/mathe" }) {
              __typename
              ... on Page {
                id
                currentRevision {
                  id
                }
              }
            }
          }
        `,
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Page',
          id: 19767,
          currentRevision: {
            id: 35476,
          },
        },
      })
    })

    test('by alias (w/ currentRevision)', async () => {
      await addPageAliasInteraction()
      await addPageRevisionInteraction()
      const response = await client.query({
        query: gql`
          {
            uuid(alias: { instance: de, path: "/mathe" }) {
              __typename
              ... on Page {
                id
                currentRevision {
                  id
                  title
                  content
                }
              }
            }
          }
        `,
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Page',
          id: 19767,
          currentRevision: {
            id: 35476,
            title: 'title',
            content: 'content',
          },
        },
      })
    })

    test('by id', async () => {
      await addPageUuidInteraction()
      const response = await client.query({
        query: gql`
          {
            uuid(id: 19767) {
              __typename
              ... on Page {
                id
                currentRevision {
                  id
                }
              }
            }
          }
        `,
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'Page',
          id: 19767,
          currentRevision: {
            id: 35476,
          },
        },
      })
    })
  })

  describe('PageRevision', () => {
    test('by id', async () => {
      await addPageRevisionInteraction()
      const response = await client.query({
        query: gql`
          {
            uuid(id: 35476) {
              __typename
              ... on PageRevision {
                id
                title
                content
                page {
                  id
                }
              }
            }
          }
        `,
      })
      expect(response.errors).toBe(undefined)
      expect(response.data).toEqual({
        uuid: {
          __typename: 'PageRevision',
          id: 35476,
          title: 'title',
          content: 'content',
          page: {
            id: 19767,
          },
        },
      })
    })
  })

  test('by id (w/ page)', async () => {
    await addPageRevisionInteraction()
    await addPageUuidInteraction()
    const response = await client.query({
      query: gql`
        {
          uuid(id: 35476) {
            __typename
            ... on PageRevision {
              id
              title
              content
              page {
                id
                currentRevision {
                  id
                }
              }
            }
          }
        }
      `,
    })
    expect(response.errors).toBe(undefined)
    expect(response.data).toEqual({
      uuid: {
        __typename: 'PageRevision',
        id: 35476,
        title: 'title',
        content: 'content',
        page: {
          id: 19767,
          currentRevision: { id: 35476 },
        },
      },
    })
  })
})

function addLicenseInteraction() {
  return pact.addInteraction({
    state: `1 is a license`,
    uponReceiving: `resolve license 1`,
    withRequest: {
      method: 'GET',
      path: '/api/license/1',
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: {
        id: 1,
        instance: Matchers.string('de'),
        default: Matchers.boolean(true),
        title: Matchers.string('title'),
        url: Matchers.string('url'),
        content: Matchers.string('content'),
        agreement: Matchers.string('agreement'),
        iconHref: Matchers.string('iconHref'),
      },
    },
  })
}

function addArticleAliasInteraction() {
  return addAliasInteraction({
    request: '/mathe/funktionen/uebersicht-aller-artikel-zu-funktionen/parabel',
    response: {
      id: 1855,
      discriminator: 'entity',
      type: 'article',
      instance: 'de',
      currentRevisionId: Matchers.integer(30674),
      licenseId: Matchers.integer(1),
    },
  })
}

function addArticleUuidInteraction() {
  return addUuidInteraction({
    request: 1855,
    response: {
      id: 1855,
      discriminator: 'entity',
      type: 'article',
      instance: 'de',
      currentRevisionId: 30674,
      licenseId: 1,
    },
  })
}

function addArticleRevisionInteraction() {
  return addUuidInteraction({
    request: 30674,
    response: {
      id: 30674,
      discriminator: 'entityRevision',
      type: 'article',
      repositoryId: 1855,
      fields: {
        title: Matchers.string('title'),
        content: Matchers.string('content'),
        changes: Matchers.string('changes'),
      },
    },
  })
}

function addPageAliasInteraction() {
  return addAliasInteraction({
    request: '/mathe',
    response: {
      id: 19767,
      discriminator: 'page',
      currentRevisionId: Matchers.integer(35476),
    },
  })
}

function addPageUuidInteraction() {
  return addUuidInteraction({
    request: 19767,
    response: {
      id: 19767,
      discriminator: 'page',
      currentRevisionId: Matchers.integer(35476),
    },
  })
}

function addPageRevisionInteraction() {
  return addUuidInteraction({
    request: 35476,
    response: {
      id: 35476,
      discriminator: 'pageRevision',
      repositoryId: 19767,
      title: Matchers.string('title'),
      content: Matchers.string('content'),
    },
  })
}

async function addAliasInteraction<
  T extends { discriminator: string; id: number }
>(payload: { request: string; response: T }) {
  const { request, response } = payload
  await pact.addInteraction({
    state: `${request} is alias of (${response.discriminator}, ${response.id}) in instance de`,
    uponReceiving: `resolve de.serlo.org${request}`,
    withRequest: {
      method: 'GET',
      path: `/api/alias${request}`,
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: response,
    },
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
      path: `/api/uuid/${request}`,
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: response,
    },
  })
}
