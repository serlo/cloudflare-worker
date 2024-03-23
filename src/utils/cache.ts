import { either as E } from 'fp-ts'
import * as t from 'io-ts'

interface CacheKeyBrand {
  readonly CacheKey: unique symbol
}

const CacheKey = t.brand(
  t.string,
  (text): text is t.Branded<string, CacheKeyBrand> => text.length <= 512,
  'CacheKey',
)
export type CacheKey = t.TypeOf<typeof CacheKey>

export async function toCacheKey(key: string): Promise<CacheKey> {
  const shortenKey = key.length > 512 ? await digestMessage(key) : key

  return E.getOrElse<unknown, CacheKey>(() => {
    throw new Error('Illegal State')
  })(CacheKey.decode(shortenKey))
}

async function digestMessage(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
