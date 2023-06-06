import { h, ComponentType, RenderableProps } from 'preact'
import renderToString from 'preact-render-to-string'

export function createStaticComponent<P = {}>(Component: ComponentType<P>) {
  return function StaticComponent(props: RenderableProps<P>) {
    const html = renderToString(<Component {...props} />)

    return (
      <div
        dangerouslySetInnerHTML={{
          __html: `<style>#root { height: 100%; }</style>${html}`,
        }}
        style="height: 100%"
      />
    )
  }
}
