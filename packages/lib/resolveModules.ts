import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export default async function resolveModules(path: string, callback: (modulePath: string, module: any) => void): Promise<void> {
  const entries = await readdir(path, { withFileTypes: true })
  await Promise.all(entries.map(async (entry) => {
    const fullpath = join(path, entry.name)
    if (entry.isDirectory()) {
      await resolveModules(fullpath, callback)
    } else if (entry.isFile() && fullpath.endsWith('.ts')) {
      callback(fullpath, require(fullpath))
    }
  }))
}
