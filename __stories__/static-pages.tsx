import { render } from '../src/static-pages/static-page'

export default {
  component: render,
  title: 'static-pages'
}

export function ExampleStaticPage() {
  return render({
    title: 'Imprint',
    content: '<h1>Imprint</h1><p>Hello World. This is an imprint.</p>'
  })
}
