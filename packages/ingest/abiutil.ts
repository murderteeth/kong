import { promises as fs } from 'fs'
import _path from 'path'

export async function load(path: string) {
  const json = await fs.readFile(_path.join(__dirname, 'abis', `${path}/abi.json`), 'utf8')
  return JSON.parse(json)
}

export function events(abi: any) {
  return abi.filter((x: any) => x.type === 'event')
}

export function exclude(names: string[], events: any) {
  return events.filter((x: any) => !names.includes(x.name))
}

export function fields(abi: any) {
  return abi.filter((x: any) => x.type === 'function' && x.stateMutability === 'view' && x.inputs.length === 0)
}

export default { load, events, exclude, fields }
