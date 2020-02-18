import { StaticPageView } from '../src/static-pages/static-page'

export default {
  component: StaticPageView,
  title: 'static-pages'
}

export function ExampleStaticPage() {
  return StaticPageView({
    title: 'Imprint',
    content: '<h1>Imprint</h1><p>Hello World. This is an imprint.</p>'
  })
}
