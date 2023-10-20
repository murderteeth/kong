import { monitors } from '../index'

export default async (_: any, args: { queueName: string }) => {
  const { queueName } = args
  try {
    if(process.env.NODE_ENV !== 'development') return []

    const monitor = monitors.get(0)
    const jobs = await monitor.failed(queueName)
    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: JSON.stringify(job.data),
      timestamp: job.timestamp,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace
    }))

  } catch (error) {
    console.error(error)
    throw new Error('Failed to resolve failed lol')
  }
}
