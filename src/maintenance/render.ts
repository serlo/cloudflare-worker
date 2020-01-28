import { DateTime } from 'luxon'

import { renderHtml } from '../html-utils'

export function render({ lang, end }: { lang: 'de' | 'en'; end?: DateTime }) {
  return renderHtml({
    lang,
    ...getTranslations()
  })

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
