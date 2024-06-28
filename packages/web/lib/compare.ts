import { CompareOperator, compare as _compare } from 'compare-versions'

const versionRegex = /^[a-zA-Z]*?(\d+(\.\d+){0,2})/

export function compare (v1: string, v2: string, operator: CompareOperator): boolean {
  const cleanV1 = extractVersion(v1)
  const cleanV2 = extractVersion(v2)
  
  return _compare(cleanV1, cleanV2, operator)
}

export function extractVersion (version: string): string {
  const match = version.match(versionRegex)
  return match != null ? match[1] : '0'
}
