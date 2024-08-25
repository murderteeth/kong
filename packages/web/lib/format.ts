
export function fPercent (amount: number, fixed?: number) {
  return `${(amount * 100).toFixed(fixed || 2)}%`
}

export function fEvmAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function fUSD(amount: number, options?: { fixed?: number, hideUsd?: boolean }) {
  const fixed = Number.isInteger(options?.fixed) ? options?.fixed : 2
  let result = ''
  if(!Number.isFinite(amount)) result = 'NaN'
  else if (amount < 1000) result = amount.toFixed(fixed)
  else if (amount < 1e6) result = `${(amount / 1e3).toFixed(fixed)}K`
  else if (amount < 1e9) result = `${(amount / 1e6).toFixed(fixed)}M`
  else if (amount < 1e12) result = `${(amount / 1e9).toFixed(fixed)}B`
  else result = `${(amount / 1e12).toFixed(fixed)}T`
  if (options?.hideUsd) return result
  return `USD ${result}`
}

export function fFixed(amount: number, options?: { accuracy?: number, locale?: string  }) {
  const { accuracy = 2, locale } = options || {}
  const [whole, fraction] = amount.toFixed(accuracy).split('.')
  const formattedWhole = new Intl.NumberFormat(locale).format(parseInt(whole))
  if (accuracy === 0) return formattedWhole
  const formattedFraction = (fraction || '0'.repeat(accuracy)).slice(0, accuracy)
  return `${formattedWhole}.${formattedFraction}`
}
