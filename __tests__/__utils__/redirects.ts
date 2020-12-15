







describe('Redirects', () => {
    describe('meet.serlo.org', () => {
      test('meet.serlo.org', async () => {
        const response = await handleUrl('https://meet.serlo.local/')
  
        const target = 'https://meet.google.com/vtk-ncrc-rdp'
        expectToBeRedirectTo(response, target, 302)
      })
  
      test('meet.serlo.org/dev', async () => {
        const response = await handleUrl('https://meet.serlo.local/dev')
  
        const target = 'https://meet.google.com/rci-pize-jow'
        expectToBeRedirectTo(response, target, 302)
      })
  
      test('meet.serlo.org/einbindung ', async () => {
        const response = await handleUrl('https://meet.serlo.local/einbindung')
  
        const target = 'https://meet.google.com/qzv-ojgk-xqw'
        expectToBeRedirectTo(response, target, 302)
      })
  
      test('meet.serlo.org/begleitung', async () => {
        const response = await handleUrl('https://meet.serlo.local/begleitung')
  
        const target = 'https://meet.google.com/kon-wdmt-yhb'
        expectToBeRedirectTo(response, target, 302)
      })
  
      test('meet.serlo.org/reviewing', async () => {
        const response = await handleUrl('https://meet.serlo.local/reviewing')
  
        const target = 'https://meet.google.com/kon-wdmt-yhb'
        expectToBeRedirectTo(response, target, 302)
      })
  
      test('meet.serlo.org/labschool ', async () => {
        const response = await handleUrl('https://meet.serlo.local/labschool')
  
        const target = 'https://meet.google.com/cvd-pame-zod'
        expectToBeRedirectTo(response, target, 302)
      })
  
      test('returns 404 when meet room is not defined', async () => {
        const response = await handleUrl('https://meet.serlo.local/def')
  
        await expectIsNotFoundResponse(response)
      })
    })
  
    test('start.serlo.org', async () => {
      const response = await handleUrl('https://start.serlo.local/')
  
      const target =
        'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/'
      expectToBeRedirectTo(response, target, 301)
    })
  
    test.each(['/labschool', '/labschool/'])('serlo.org%s', async (path) => {
      const response = await handleUrl(`https://de.serlo.local${path}`)
  
      expectToBeRedirectTo(response, 'https://labschool.serlo.local/', 301)
    })
  
    test.each(['/hochschule', '/hochschule/'])('serlo.org%s', async (path) => {
      const response = await handleUrl(`https://de.serlo.local${path}`)
  
      const target = 'https://de.serlo.local/mathe/universitaet/44323'
      expectToBeRedirectTo(response, target, 301)
    })
  
    test.each(['/beitreten', '/beitreten/'])('serlo.org%s', async (path) => {
      const response = await handleUrl(`https://de.serlo.local${path}`)
  
      const target =
        'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform'
      expectToBeRedirectTo(response, target, 301)
    })
  
    test('serlo.org/*', async () => {
      const response = await handleUrl('https://serlo.local/foo')
  
      expectToBeRedirectTo(response, 'https://de.serlo.local/foo', 302)
    })
  
    test('www.serlo.org/*', async () => {
      const response = await handleUrl('https://www.serlo.local/foo')
  
      expectToBeRedirectTo(response, 'https://de.serlo.local/foo', 302)
    })
  
    describe('redirects to current path of an resource', () => {
      beforeEach(() => {
        givenUuid({
          id: 78337,
          __typename: 'Page',
          oldAlias: '/sexed',
          alias: '/sex-ed',
          instance: Instance.En,
        })
      })
  
      test('redirects when current path is different than target path', async () => {
        const response = await handleUrl('https://en.serlo.org/sexed')
  
        expectToBeRedirectTo(response, 'https://en.serlo.org/sex-ed', 301)
      })
  
      test('redirects when current instance is different than target instance', async () => {
        const response = await handleUrl('https://de.serlo.org/78337')
  
        expectToBeRedirectTo(response, 'https://en.serlo.org/sex-ed', 301)
      })
  
      test('no redirect when current path is different than given path and XMLHttpRequest', async () => {
        mockHttpGet('https://en.serlo.org/sexed', returnsText('article content'))
  
        const request = new Request('https://en.serlo.org/sexed', {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        })
        const response = await handleRequest(request)
  
        expect(await response.text()).toBe('article content')
      })
  
      test('no redirect when current path is the same as given path', async () => {
        mockHttpGet('https://en.serlo.org/sex-ed', returnsText('article content'))
  
        const response = await handleUrl('https://en.serlo.org/sex-ed')
  
        expect(await response.text()).toBe('article content')
      })
  
      test('no redirect when requested entity has no alias', async () => {
        givenUuid({ id: 128620, __typename: 'ArticleRevision' })
        mockHttpGet('https://de.serlo.org/128620', returnsText('article content'))
  
        const response = await handleUrl('https://de.serlo.org/128620')
  
        expect(await response.text()).toBe('article content')
      })
  
      test('redirects to first course page when requested entity is empty', async () => {
        givenUuid({
          id: 61682,
          __typename: 'Course',
          alias:
            '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen',
          pages: [
            {
              alias:
                '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/%C3%9Cbersicht',
            },
            {
              alias:
                '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/negative-zahlen-alltag',
            },
          ],
        })
  
        const response = await handleUrl('https://de.serlo.org/61682')
  
        expectToBeRedirectTo(
          response,
          'https://de.serlo.org/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/%C3%9Cbersicht',
          301
        )
      })
  
      test('redirects to alias of course when list of course pages is empty', async () => {
        // TODO: Find an empty course at serlo.org
        givenUuid({
          id: 42,
          __typename: 'Course',
          alias: '/course',
          pages: [],
        })
  
        const response = await handleUrl('https://en.serlo.org/42')
  
        expectToBeRedirectTo(response, 'https://en.serlo.org/course', 301)
      })
  
      test('no redirect when current path cannot be requested', async () => {
        givenApi(returnsMalformedJson())
  
        mockHttpGet('https://en.serlo.org/path', returnsText('article content'))
  
        const response = await handleUrl('https://en.serlo.org/path')
  
        expect(await response.text()).toBe('article content')
      })
  
      test('handles URL encodings correctly', async () => {
        givenUuid({
          __typename: 'TaxonomyTerm',
          alias: '/mathe/zahlen-größen/größen-einheiten',
        })
        mockHttpGet(
          'https://de.serlo.org/mathe/zahlen-gr%C3%B6%C3%9Fen',
          returnsText('article content')
        )
  
        const response = await handleUrl(
          'https://de.serlo.org/mathe/zahlen-größen'
        )
  
        expect(await response.text()).toBe('article content')
      })
    })
  })
  