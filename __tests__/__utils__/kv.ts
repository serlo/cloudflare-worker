export function createKV<K extends string = string>(): KVNamespace<K> {
  const values = {} as Record<K, string | undefined>
  return {
    get(key: K, options?: unknown) {
      if (options !== undefined) {
        throw new Error(
          'get function for type ${options.type} not yet implemented',
        )
      }

      return Promise.resolve(values[key] ?? null)
    },
    getWithMetadata(_key: unknown, _options: unknown) {
      throw new Error('not implemented')
    },
    list(_options) {
      throw new Error('not implemented')
    },
    delete(_name) {
      throw new Error('not implemented')
    },
    put(key, value: string, _) {
      if (key.length > 512) {
        throw new Error('Error: key longer than 512 characters.')
      }
      values[key] = value

      return Promise.resolve(undefined)
    },
  } as KVNamespace<K>
}
