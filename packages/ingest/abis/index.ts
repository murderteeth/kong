import { readdir } from 'fs/promises'
import { join } from 'path'
import { AbiHook, HookModule, HookType, ResolveHooks } from './types'
import { removeLeadingAndTrailingSlash } from 'lib/strings'

const eventHookRegex = /\/event\/([^/]+\/)?hook.ts$/
const snapshotHookRegex = /\/snapshot\/hook.ts$/
const timeseriesHookRegex = /\/timeseries\/([^/]+\/)?hook.ts$/
const hookre: { [type in HookType]: RegExp } = {
  event: eventHookRegex,
  snapshot: snapshotHookRegex,
  timeseries: timeseriesHookRegex
}

export const defaultRoot = __dirname

export async function requireHooks(path?: string): Promise<ResolveHooks> {
  const hooks = await __requireHooks(path || defaultRoot, '')
  return (path: string, type?: HookType) => {
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
      if (!isHookPath(fullPath)) return
      const { type, abiPath } = parseHookPath(fullPath, startPath)
      result.push({
        type, abiPath, module: require(fullPath) as HookModule
      })

    }
  }))
  return result
}

export function isHookPath(fullPath: string): boolean {
  return getHookType(fullPath) !== undefined
}

export function parseHookPath(fullPath: string, startPath: string): { type: HookType, abiPath: string } {
  const type = getHookType(fullPath)
  if (!type) throw new Error(`!HookType, ${fullPath}`)
  return { type, abiPath: parseAbiPath(hookre[type], fullPath, startPath) }
}

function parseAbiPath(re: RegExp, fullPath: string, startPath: string) {
  return removeLeadingAndTrailingSlash(fullPath.replace(re, '').replace(startPath, ''))
}

export function getHookType(fullPath: string): HookType | undefined {
  return Object.keys(hookre).find(k => hookre[k as HookType].test(fullPath)) as HookType | undefined
}
