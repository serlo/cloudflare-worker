import { h } from 'preact'

import { data } from '../__fixtures__/are-we-edtr-io-yet'
import { render } from '../src/are-we-edtr-io-yet/render'

const AreWeEdtrIoYet = createStaticComponent(render)

export default {
  component: AreWeEdtrIoYet,
  title: 'are-we-edtr-io-yet'
}

export function Simple() {
  return <AreWeEdtrIoYet {...data} />
}

function createStaticComponent<P>(f: (props: P) => string) {
  return function StaticComponent(props: P) {
    const html = f(props)
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }
}
