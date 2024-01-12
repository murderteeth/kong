type ReplacerFunction = (this: any, key: string, value: any) => any
type Space = string | number

interface JSONStringify {
  (value: any, replacer?: ReplacerFunction, space?: Space): string
  (value: any, replacer?: (string | number)[] | null, space?: Space): string
}

const originalJSONStringify: JSONStringify = JSON.stringify

JSON.stringify = ((value: any, replacer?: ReplacerFunction | (string | number)[] | null, space?: Space): string => {
  return originalJSONStringify(value, function(key: string, val: any): any {
    if (typeof val === 'bigint') {
      return val.toString() + 'n'
    }
    return replacer instanceof Function ? replacer.call(this, key, val) : val
  }, space)
}) as JSONStringify

const originalJSONParse = JSON.parse

type ReviverFunction = (this: any, key: string, value: any) => any

interface JSONParse {
  (text: string, reviver?: ReviverFunction): any
}

JSON.parse = ((text: string, reviver?: ReviverFunction): any => {
  return originalJSONParse(text, function(key: string, val: any): any {
    if (typeof val === "string" && /^[0-9]+n$/.test(val)) {
      return BigInt(val.slice(0, -1));
    }

    return reviver instanceof Function ? reviver.call(this, key, val) : val
  })
}) as JSONParse
