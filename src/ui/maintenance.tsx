import { h } from 'preact'

import { Template, CenteredContent } from './template'

export function Maintenance({ lang, end }: { lang: 'de' | 'en'; end?: Date }) {
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
