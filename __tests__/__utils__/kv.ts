export function createKV<K extends string = string>(
  currentTime: () => number,
): KVNamespace<K> {
  const values = {} as Record<
    K,
    { value: string; expiresAt: number | null } | undefined
  >
  return {
    get(key: K, options?: unknown) {
      if (options !== undefined) {
        throw new Error(
          'get function for type ${options.type} not yet implemented',
        )
      }

      const entry = values[key]

      const result =
        entry === undefined
          ? null
          : entry.expiresAt !== null && currentTime() > entry.expiresAt
            ? null
            : entry.value

      return Promise.resolve(result)
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
    put(key, value: string, args) {
      if (key.length > 512) {
        throw new Error('Error: key longer than 512 characters.')
      }
      const expiresAt =
        args?.expirationTtl != null ? args.expirationTtl + currentTime() : null
      values[key] = { value, expiresAt }

      return Promise.resolve(undefined)
    },
  } as KVNamespace<K>
}
