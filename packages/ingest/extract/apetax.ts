import { mq, types } from 'lib'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { rpcs } from '../rpcs'

interface ApetaxVault { 
  TITLE: string
  LOGO: string
  VAULT_ABI: string
  VAULT_TYPE: string
  VAULT_ADDR: string
  WANT_ADDR: string
  WANT_SYMBOL: string
  COINGECKO_SYMBOL: string
  VAULT_STATUS: string
  CHAIN_ID: number
}

export class ApetaxExtractor implements Processor {
  url: string = process.env.APE_TAX_VAULTS || 'https://raw.githubusercontent.com/saltyfacu/ape-tax/master/utils/vaults.json'
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.extract)
  }

  async down() {
    await this.queue?.close()
  }

  async extract(_: any) {
    console.log('🦍', 'extract apetax registry')

    const vaults = Object.values(await(
      await fetch(this.url)
    ).json()) as ApetaxVault[]

    const latestBlocks: { [chainId: number]: bigint } = {}

    for(const vault of vaults) {
      const latestBlock = latestBlocks[vault.CHAIN_ID] || await rpcs.next(vault.CHAIN_ID).getBlockNumber()
      latestBlocks[vault.CHAIN_ID] = latestBlock

      await this.queue?.add(mq.job.extract.vault, {
        chainId: vault.CHAIN_ID,
        apetaxType: vault.VAULT_TYPE,
        apetaxStatus: vault.VAULT_STATUS,
        address: vault.VAULT_ADDR,
        assetAddress: vault.WANT_ADDR,
        __as_of_block: latestBlock
      } as types.Vault, {
        jobId: `${vault.CHAIN_ID}-${latestBlock}-${vault.VAULT_ADDR}`
      })
    }
  }
}
