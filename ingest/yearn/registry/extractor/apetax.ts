import { mq, types } from 'lib'
import { Processor } from '../../../processor'
import { Queue } from 'bullmq'
import { RpcClients, rpcs } from '../../../rpcs'

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
  rpcs: RpcClients
  queue: Queue | undefined

  constructor() {
    this.rpcs = rpcs.next()
  }

  async up() {
    this.queue = mq.queue(mq.q.yearn.vault.extract)    
  }

  async down() {
    await this.queue?.close()
  }

  async extract(_: any) {
    console.log('🦍', 'extract apetax registry')
    const vaults = Object.values(await(
      await fetch(this.url)
    ).json()) as ApetaxVault[]

    const latestBlocks: { [chainId: number]: { block: bigint } } = {}

    for(const vault of vaults) {
      const rpc = this.rpcs[vault.CHAIN_ID]
      if(!rpc) continue

      const latestBlock = latestBlocks[vault.CHAIN_ID] || await rpc.getBlockNumber()
      latestBlocks[vault.CHAIN_ID] = latestBlock

      await this.queue?.add(mq.q.yearn.vault.extractJobs.state, {
        chainId: vault.CHAIN_ID,
        apetaxType: vault.VAULT_TYPE,
        apeTaxStatus: vault.VAULT_STATUS,
        address: vault.VAULT_ADDR,
        assetAddress: vault.WANT_ADDR,
        asOfBlockNumber: latestBlock.toString()
      } as types.Vault, {
        jobId: `${vault.CHAIN_ID}-${latestBlock}-${vault.VAULT_ADDR}`
      })
    }
  }
}
