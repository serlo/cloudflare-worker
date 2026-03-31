/* eslint-disable import/no-extraneous-dependencies */
import { transform } from 'esbuild'

/**
 * @param {string | Uint8Array} src
 * @param {string} filename
 */
async function processAsync(src, filename) {
  const result = await transform(src, {
    loader: getLoader(filename),
    format: 'esm',
    target: 'node20',
    sourcemap: true,
    sourcefile: filename,
  })
  return {
    code: result.code,
    map: result.map,
  }
}

/**
 * @param {string} filename
 */
function getLoader(filename) {
  const ext = filename.split('.').pop()
  switch (ext) {
    case 'ts':
      return 'ts'
    case 'tsx':
      return 'tsx'
    case 'js':
      return 'js'
    case 'jsx':
      return 'jsx'
    default:
      throw new Error(`Unsupported file extension: ${ext}`)
  }
}

export default { processAsync }
