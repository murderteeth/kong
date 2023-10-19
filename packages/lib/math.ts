
export function div(a: bigint, b: bigint, precision: number = 18) {
  if(b === BigInt(0)) return Number.NaN
  const scaleFactor = BigInt(10 ** precision)
  const quotient = (a * scaleFactor) / b
  const wholePart = quotient / scaleFactor
  const fractionalPart = quotient % scaleFactor
  return Number(wholePart + '.' + fractionalPart.toString().padStart(precision, '0'))
}

export function min(...args: bigint[]): bigint {
  return args.reduce((a, b) => (a < b ? a : b))
}

export function max(...args: bigint[]): bigint {
  return args.reduce((a, b) => (a > b ? a : b))
}
