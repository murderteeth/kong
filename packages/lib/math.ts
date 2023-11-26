
export function div(a: bigint, b: bigint, precision: number = 18) {
  if(b === 0n) return Number.NaN

  const sign = (a < 0n) !== (b < 0n) ? -1 : 1
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b

  const scaleFactor = BigInt(10 ** precision)
  const quotient = (a * scaleFactor) / b
  const wholePart = quotient / scaleFactor
  const fractionalPart = quotient % scaleFactor

  return sign * Number(wholePart + '.' + fractionalPart.toString().padStart(precision, '0'))
}

export function min(...args: bigint[]): bigint {
  return args.reduce((a, b) => (a < b ? a : b))
}

export function max(...args: bigint[]): bigint {
  return args.reduce((a, b) => (a > b ? a : b))
}

export function scaleDown(value: bigint, decimals: number, precision: number = 18): number {
  const factor = BigInt(10 ** precision)
  return Number(value * factor / BigInt(10 ** decimals)) / Number(factor)
}
