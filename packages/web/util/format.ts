
export function fPercent (amount: number, fixed?: number) {
  return `${(amount * 100).toFixed(fixed || 2)}%`
}

export function fEvmAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function fUSD(amount: number, fixed?: number) {
  if (amount < 1000) return `USD ${amount.toFixed(fixed || 2)}`
  if (amount < 1e6) return `USD ${Math.floor(amount / 1e3)}K`
  if (amount < 1e9) return `USD ${Math.floor(amount / 1e6)}M`
  if (amount < 1e12) return `USD ${Math.floor(amount / 1e9)}B`
  return `USD ${Math.floor(amount / 1e12)}T`
}
