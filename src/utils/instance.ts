export enum Instance {
  De = 'de',
  En = 'en',
  Es = 'es',
  Fr = 'fr',
  Hi = 'hi',
  Ta = 'ta',
}

export function isInstance(code: unknown): code is Instance {
  return Object.values(Instance).some((x) => x === code)
}
