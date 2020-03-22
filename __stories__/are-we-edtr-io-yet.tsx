import { h } from 'preact'

import { data } from '../__fixtures__/are-we-edtr-io-yet'
import { createStaticComponent } from './utils'

import { AreWeEdtrIoYet as Original } from '../src/are-we-edtr-io-yet/template'
const AreWeEdtrIoYet = createStaticComponent(Original)

export default {
  component: AreWeEdtrIoYet,
  title: 'are-we-edtr-io-yet'
}

export function Simple() {
  return <AreWeEdtrIoYet data={data} />
}
