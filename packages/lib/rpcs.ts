import { chains } from 'lib'
import { PublicClient, createPublicClient, webSocket } from 'viem'
import { Chain } from 'viem/chains'

export interface RpcClients { [chaindId: number]: PublicClient }

class pool {
  private recycling: NodeJS.Timeout | undefined
  private rpcs = {} as { [chainId: number]: { 
    clients: PublicClient[], 
    pointers: { next: number, recycle: number } 
  }}

  constructor(private size: number, private recycleMs: number) {}

  private wss(chain: Chain) {
    return process.env[`WSS_NETWORK_${chain.id}`] as string
  }

  private setupRpcs() {
    for(const chain of chains) {
      this.rpcs[chain.id] = {
        clients: Array(this.size).fill(createPublicClient({
          chain, transport: webSocket(this.wss(chain))
        })),
        pointers: { next: 0, recycle: 0 }
      }
    }
  }

  private startRecycling() {
    this.recycling = setInterval(async () => {
      Object.keys(this.rpcs).forEach(chainId => {
        const forChain = this.rpcs[parseInt(chainId)]
        const clients = forChain.clients
        const pointer = forChain.pointers.recycle
        const rpc = clients[pointer]
        console.log('♻️ ', 'rpc', chainId, pointer)
        clients[pointer] = createPublicClient({
          chain: rpc.chain, transport: webSocket(this.wss(rpc.chain as Chain))
        })
        forChain.pointers.recycle = (pointer + 1) % clients.length
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

  next(chainId: number) {
    const result = this.rpcs[chainId].clients[this.rpcs[chainId].pointers.next]
    this.rpcs[chainId].pointers.next = (this.rpcs[chainId].pointers.next + 1) % this.rpcs[chainId].clients.length
    return result
  }

  nextAll() {
    const result = {} as RpcClients
    Object.keys(this.rpcs).forEach(chainId => {
      result[parseInt(chainId)] = this.next(parseInt(chainId))
    })
    return result
  }
}

export const rpcs = new pool(2, 10 * 60 * 1000)