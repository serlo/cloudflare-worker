import { h } from 'preact'

import { data } from '../__fixtures__/are-we-edtr-io-yet'
import { AreWeEdtrIoYet } from '../src/are-we-edtr-io-yet/template'

export default {
  component: AreWeEdtrIoYet,
  title: 'are-we-edtr-io-yet'
}

export function Simple() {
  return <AreWeEdtrIoYet data={data} />
}
