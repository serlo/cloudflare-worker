import { faviconBase64, logoBase64 } from './assets/logos'

export function getNotFoundHtml() {
  return wrapInTemplate({
    title: 'Page Not Found',
    lang: 'en',
    content: `<p>The page you have requested does not exist.</p>`,
  })
}

export function getMaintenanceHtml({
  lang,
  end,
}: {
  lang: 'de' | 'en'
  end?: Date
}) {
  const { content, title } = getTranslations()

  return wrapInTemplate({ content, lang, title })

  function getTranslations() {
    switch (lang) {
      case 'de':
        return {
          title: 'Wartungsmodus',
          content: `Wir führen gerade Wartungsarbeiten durch und sind ${
            end ? `gegen ${end.toLocaleString('de')}` : 'in ein paar Stunden'
          } wieder online.`,
        }
      case 'en':
        return {
          title: 'Maintenance mode',
          content: `Serlo is currently down for maintenance. We expect to be back ${
            end ? `by ${end.toLocaleString('en')}` : 'in a couple of hours.'
          }`,
        }
    }
  }
}

export function wrapInTemplate({
  content,
  lang,
  title,
}: {
  content: string
  lang: 'de' | 'en'
  title: string
}) {
  const isDe = lang === 'de'
  return `
  <html lang="${lang}">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Serlo - ${title}</title>
        <link
          href=${faviconBase64}
          rel="icon"
          type="image/x-icon"
        />
        <style>
          body {
            padding: 2rem;
            font-size: 1.2rem;
            font-family: sans-serif;
          }
          #logo {
            width: 12rem;
          }
          main {
            margin-top: 3rem;
            padding-left: 4rem;
          }
          footer {
            position: absolute;
            bottom: 0;
            left: 3rem;
            padding-bottom: 2rem;
            background-color: white;
            padding-left: 4rem;
          }
          a {
            color: #0076b9;
          }
          a:hover, a:active {
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <header>
          <img
            id="logo"
            alt="Serlo Logo"
            src=${logoBase64}
          />
        </header>
        <main>
          <h1>${title}</h1>
          ${content}
        </main>

        <footer>
          <a href="https://github.com/serlo/serlo.org-legal/blob/main/${
            isDe ? 'de' : 'en'
          }/imprint.md">
            ${isDe ? 'Impressum' : 'Legal Notice'}
          </a>
        </footer>
      </body>
    </html>
  `
}
