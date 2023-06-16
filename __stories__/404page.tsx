import { h } from 'preact'

import { createStaticComponent } from './utils'
import { NotFound as NotFoundOriginal } from '../src/ui'

const NotFound = createStaticComponent(NotFoundOriginal)

// eslint-disable-next-line import/no-default-export
export default {
  component: NotFound,
  title: '404page',
}
export function PageNotFound() {
  return <NotFound />
}
