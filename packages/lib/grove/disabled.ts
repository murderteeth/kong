import { GroveCore } from '.'

export const disabled: GroveCore = {
  provider: () => 'filesystem',
  exists: async (path) => false,
  store: async (path, json) => {},
  get: async (path) => { throw new Error('disabled') },
  list: async (path) => [],
  delete: async (path) => {}
}
