import { DateTime } from 'luxon'
import { h } from 'preact'
import renderToString from 'preact-render-to-string'

import { Template } from '../ui'

export function render(props: { lang: 'de' | 'en'; end?: DateTime }) {
  return renderToString(<Maintenance {...props} />)
}

function Maintenance({ lang, end }: { lang: 'de' | 'en'; end?: DateTime }) {
  const { content, title } = getTranslations()
  return (
    <Template lang={lang} title={title}>
      {content}
    </Template>
  )

  function getTranslations() {
    switch (lang) {
      case 'de':
        return {
          title: 'Wartungsmodus',
          content: `Wir führen gerade Wartungsarbeiten durch und sind ${
            end
              ? `gegen ${end.setLocale('de').toFormat('HH:mm (ZZZZ)')}`
              : 'in ein paar Stunden'
          } wieder online.`
        }
      case 'en':
        return {
          title: 'Maintenance mode',
          content: `Serlo is currently down for maintenance. We expect to be back ${
            end
              ? `by ${end.setLocale('en').toFormat('HH:mm (ZZZZ)')}`
              : 'in a couple of hours.'
          }`
        }
    }
  }
}
