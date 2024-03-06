import { readdir } from 'fs/promises'
import { join } from 'path'
import { AbiHook, HookModule, ResolveHooks } from './types'
import { removeLeadingAndTrailingSlash } from 'lib/strings'

const eventHookRegex = /\/event\/([^/]+\/)?hook.ts$/
const snapshotHookRegex = /\/snapshot\/hook.ts$/

export async function requireHooks(path?: string): Promise<ResolveHooks> {
  const hooks = await __requireHooks(path || __dirname, '')
  return (path: string, type?: 'event'|'snapshot') => {
    const abiPathRegex = new RegExp(`^${path}(/|$)`)
    return hooks.filter(h => {
      return (abiPathRegex.test(h.abiPath) || h.abiPath === '' || path === '')
      && (type ? h.type === type : true)
    })
  }
}

async function __requireHooks(startPath: string, nextPath: string): Promise<AbiHook[]> {
  const result: AbiHook[] = []
  const entries = await readdir(join(startPath, nextPath), { withFileTypes: true })
  await Promise.all(entries.map(async (entry) => {
    const nextNextPath = join(nextPath, entry.name)

    if (entry.isDirectory()) {
      result.push(...await __requireHooks(startPath, nextNextPath))

    } else if (entry.isFile() && nextNextPath.endsWith('hook.ts')) {
      const fullPath = join(startPath, nextNextPath)
      if (!(eventHookRegex.test(fullPath) || snapshotHookRegex.test(fullPath))) return

      const type = eventHookRegex.test(fullPath) ? 'event' : 'snapshot'
      const abiPath = eventHookRegex.test(fullPath)
      ? removeLeadingAndTrailingSlash(fullPath.replace(eventHookRegex, '').replace(startPath, ''))
      : removeLeadingAndTrailingSlash(fullPath.replace(snapshotHookRegex, '').replace(startPath, ''))

      result.push({
        type, abiPath, module: require(fullPath) as HookModule
      })

    }
  }))
  return result
}
