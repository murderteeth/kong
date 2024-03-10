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
          job: mq.job.fanout.contracts
        }},
        { title: 'fanout replays', value: {
          job: mq.job.fanout.contracts,
          data: { replay: true }
        }},
        { title: 'compute tvls', value: {
          job: mq.job.fanout.tvl
        }},
        { title: 'compute apys', value: {
          job: mq.job.fanout.apy
        }},
        { title: 'compute harvest aprs', value: {
          job: mq.job.fanout.harvestApr
        }},
        { title: 'update risk', value: {
          job: mq.job.extract.risk
        }},
        { title: 'update meta', value: {
          job: mq.job.extract.meta
        }},
        { title: 'extract waveydb', value: {
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
    await mq.add(q.job, q.data || {})
  }
}
