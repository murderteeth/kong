import { readdir } from 'fs/promises'
import { join } from 'path'
import { removeLeadingAndTrailingSlash } from './strings'

export default async function resolveAbiHooks(path: string, callback: (abiPath: string, module: any) => void): Promise<void> {
  await __resolveAbiHooks(path, '', callback)
}

async function __resolveAbiHooks(startPath: string, nextPath: string, callback: (abiPath: string, module: any) => void): Promise<void> {
  const entries = await readdir(join(startPath, nextPath), { withFileTypes: true })
  await Promise.all(entries.map(async (entry) => {
    const nextNextPath = join(nextPath, entry.name)
    if (entry.isDirectory()) {
      await __resolveAbiHooks(startPath, nextNextPath, callback)
    } else if (entry.isFile() && nextNextPath.endsWith('hook.ts')) {
      const fullPath = join(startPath, nextNextPath)
      const abiPath = removeLeadingAndTrailingSlash(fullPath.replace(startPath, '').replace(entry.name, ''))
      callback(abiPath, require(fullPath))
    }
  }))
}
