import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Ingest', value: 'ingest' }
} as MenuAction

async function action() {
  const { q, confirm } = await prompts([
    {
      type: 'select',
      name: 'q',
      message: 'pick an ingest job',
      choices: [
        { title: 'fanout contracts', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.contracts
        }},
        { title: 'sync local->grove', value: {
          name: mq.q.load,
          job: mq.job.load.sync,
          data: { direction: 'local->grove' }
        }},
        { title: 'index registry events', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.registry
        }},
        { title: 'index factory events', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.factory
        }},
        { title: 'index vault events', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.vault
        }},
        { title: 'compute tvls', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.tvl
        }},
        { title: 'compute apys', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.apy
        }},
        { title: 'compute harvest aprs', value: {
          name: mq.q.fanout,
          job: mq.job.fanout.harvestApr
        }},
        { title: 'update risk', value: {
          name: mq.q.extract,
          job: mq.job.extract.risk
        }},
        { title: 'update meta', value: {
          name: mq.q.extract,
          job: mq.job.extract.meta
        }},
        { title: 'extract waveydb', value: {
          name: mq.q.extract,
          job: mq.job.extract.waveydb
        }},
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 ${all.q.name} ${all.q.job}?`,
    }
  ])

  if (confirm) {
    const queue = mq.queue(q.name)
    await queue.add(q.job, q.data || {})
    await queue.close()
  }
}
