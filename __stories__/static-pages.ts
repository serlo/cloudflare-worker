import { UnrevisedPageView } from '../src/static-pages'

export default {
  component: UnrevisedPageView,
  title: 'static-pages'
}

export function ExampleUnrevisedPage() {
  return UnrevisedPageView({
    lang: 'en',
    title: 'Imprint',
    content: '<h1>Imprint</h1><p>Hello World. This is an imprint.</p>'
  })
}
