import { chains } from 'lib'
import { PublicClient, createPublicClient, webSocket } from 'viem'
import { Chain } from 'viem/chains'

export interface RpcClients { [chaindId: number]: PublicClient }

class pool {
  private recycling: NodeJS.Timeout | undefined
  private rpcs = {} as { [key: string]: { 
    clients: PublicClient[], 
    pointers: { next: number, recycle: number } 
  }}

  constructor(private size: number, private recycleMs: number) {}

  private wss(chain: Chain, archive: boolean) {
    if(archive) return process.env[`WSS_ARCHIVE_${chain.id}`] as string
    return process.env[`WSS_FULLNODE_${chain.id}`] as string
  }

  private key(chain: Chain, archive: boolean) {
    return `${chain.id}-${archive}`
  }

  private parseKey(key: string) {
    const parts = key.split('-')
    return { chainId: parseInt(parts[0]), archive: parts[1] === 'true' }
  }

  private setupRpcs() {
    for(const chain of chains) {
      for(const archive of [true, false]) {
        this.rpcs[this.key(chain, archive)] = {
          clients: Array(this.size).fill(createPublicClient({
            chain, transport: webSocket(this.wss(chain, archive))
          })),
          pointers: { next: 0, recycle: 0 }
        }
      }
    }
  }

  private startRecycling() {
    this.recycling = setInterval(async () => {
      Object.keys(this.rpcs).forEach(key => {
        const { chainId, archive } = this.parseKey(key)
        const rpcsForKey = this.rpcs[key]
        const clients = rpcsForKey.clients
        const pointer = rpcsForKey.pointers.recycle
        const rpc = clients[pointer]
        console.log('♻️ ', 'rpc', chainId, pointer)
        clients[pointer] = createPublicClient({
          chain: rpc.chain, transport: webSocket(this.wss(rpc.chain as Chain, archive))
        })
        rpcsForKey.pointers.recycle = (pointer + 1) % clients.length
        rpc.transport.getSocket().then((socket: any) => socket.close())
      })
    }, this.recycleMs)
  }

  async up() {
    this.setupRpcs()
    if(this.size < 2) return
    this.startRecycling()
  }

  async down() {
    clearInterval(this.recycling)
    for(const pool of Object.values(this.rpcs)) {
      for(const rpc of pool.clients) {
        (await rpc.transport.getSocket()).close()
      }
      pool.clients.length = 0
      pool.pointers.next = 0
      pool.pointers.recycle = 0
    }
  }

  next(chainId: number, archive = true) {
    const chain = chains.find(chain => chain.id === chainId)
    if(!chain) throw new Error(`!chain, ${chainId}`)
    const key = this.key(chain, archive)
    const rpcs = this.rpcs[key]
    const result = rpcs.clients[rpcs.pointers.next]
    rpcs.pointers.next = (rpcs.pointers.next + 1) % rpcs.clients.length
    return result
  }
}

export const rpcs = new pool(2, 10 * 60 * 1000)
