import { z } from 'zod'
import grove from '.'
import * as math from '../math'

export const StrideSchema = z.object({
  from: z.bigint({ coerce: true }),
  to: z.bigint({ coerce: true })
})

export type Stride = z.infer<typeof StrideSchema>

async function get(path: string): Promise<Stride[]> {
  if(!(await grove().exists(path))) return []
  const object = await grove().get(path)
  return StrideSchema.array().parse(object)
}

function add(current: Stride[], next: Stride) {
  let merged = false
  let result: Stride[] = current.reduce((acc, cur) => {
    if (next.from <= cur.to + 1n && next.to >= cur.from - 1n) {
      merged = true
      return [...acc, { from: math.min(cur.from, next.from), to: math.max(cur.to, next.to) }]
    } else {
      return [...acc, cur]
    }
  }, [] as Stride[])

  if (!merged) {
    result.push(next)
  }

  result = result.reduce((acc, cur) => {
    if (acc.length === 0) return [cur]
    let last = acc[acc.length - 1]
    if (cur.from <= last.to + 1n) {
      last.to = math.max(last.to, cur.to)
      return acc
    } else {
      return [...acc, cur]
    }
  }, [] as Stride[])

  return result.sort((a, b) => Number(a.from - b.from))
}

async function store(prefix: string, stride: Stride) {
  const path = `${prefix}/__strides.json`
  const current = await get(path)
  const next = add(current, stride)
  await grove().store(path, next)
}

export default {
  get,
  add,
  store
}
