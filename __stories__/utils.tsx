import { h } from 'preact'
import { FunctionComponent, RenderableProps, VNode } from 'preact'
import renderToString from 'preact-render-to-string'

export function createStaticComponent<P = {}>(Component: FunctionComponent<P>) {
  return function StaticComponent(props: RenderableProps<P>) {
    const html = renderToString(Component(props) as VNode<any>)

    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }
}
