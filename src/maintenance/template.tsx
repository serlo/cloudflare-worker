import { DateTime } from 'luxon'
import { h } from 'preact'

import { Template, CenteredContent } from '../ui'

export function Maintenance({
  lang,
  end
}: {
  lang: 'de' | 'en'
  end?: DateTime
}) {
  const { content, title } = getTranslations()
  return (
    <Template lang={lang} title={title}>
      <CenteredContent>{content}</CenteredContent>
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
