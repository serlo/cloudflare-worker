export function getPlaceholder() {
  const placeholderBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAwAAAAGwAQMAAAAkGpCRAAAAA1BMVEXv9/t0VvapAAAAP0lEQVR42u3BMQEAAADCIPuntsUuYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQOqOwAAHrgHqAAAAAAElFTkSuQmCC'
  const placeholder = Uint8Array.from(atob(placeholderBase64), (c) =>
    c.charCodeAt(0),
  )
  return new Response(placeholder, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': placeholder.length.toString(),
    },
  })
}

export function isImageResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type') ?? ''
  return res.status === 200 && contentType.startsWith('image/')
}
