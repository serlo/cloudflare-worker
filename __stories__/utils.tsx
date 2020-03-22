import { h } from 'preact'
import { ComponentType, RenderableProps } from 'preact'
import renderToString from 'preact-render-to-string'

export function createStaticComponent<P = {}>(Component: ComponentType<P>) {
  return function StaticComponent(props: RenderableProps<P>) {
    const html = renderToString(<Component {...props} />)

    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }
}
