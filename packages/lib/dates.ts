export function DEFAULT_START_MS() {
  return daysAgoInMs(Number(process.env.DEFAULT_START_DAYS_AGO || 30))
} 
export function DEFAULT_START_SEC() {
  return BigInt(Math.floor(DEFAULT_START_MS() / 1000))
}

export function daysAgoInMs(days: number): number {
  const now = new Date().getTime()
  return now - days * 24 * 60 * 60 * 1000
}
