export default async function batchx<T>(things: T[], batchSize: number, x: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < things.length; i += batchSize) {
    await x(things.slice(i, i + batchSize))
  }
}
