import { PublicClient, createPublicClient, webSocket } from 'viem'
import { mainnet, polygon } from 'viem/chains'

export interface RpcClients { [chaindId: number]: PublicClient }

class pool {
  private recycle = 10 * 60 * 1000
  private interval: NodeJS.Timeout | undefined
  private rpcs = {
    [mainnet.id as number]: {
      clients: [] as PublicClient[],
      pointers: { next: 0, recycle: 0 }
    },
    [polygon.id as number]: {
      clients: [] as PublicClient[],
      pointers: { next: 0, recycle: 0 }
    }
  }

  private setClients() {
    this.rpcs[mainnet.id].clients = Array(2).fill(createPublicClient({
      chain: mainnet,
      name: process.env.WSS_NETWORK_1, // stash url in name for later use
      transport: webSocket(process.env.WSS_NETWORK_1)
    })),
    this.rpcs[polygon.id].clients = Array(2).fill(createPublicClient({
      chain: polygon,
      name: process.env.WSS_NETWORK_137, // stash url in name for later use
      transport: webSocket(process.env.WSS_NETWORK_137)
    }))
  }

  private setInterval() {
    this.interval = setInterval(async () => {
      const clients = this.rpcs[mainnet.id].clients
      const pointer = this.rpcs[mainnet.id].pointers.recycle
      const rpc = clients[pointer]
      console.log('♻️ ', 'rpc', mainnet.name, pointer, rpc.name)
      clients[pointer] = createPublicClient({
        chain: mainnet, transport: webSocket(rpc.name)
      })
      this.rpcs[mainnet.id].pointers.recycle = (pointer + 1) % clients.length
    }, this.recycle)
  }

  up() {
    this.setClients()
    this.setInterval()
  }

  private _next(chainId: number) {
    const result = this.rpcs[chainId].clients[this.rpcs[chainId].pointers.next]
    this.rpcs[chainId].pointers.next = (this.rpcs[chainId].pointers.next + 1) % this.rpcs[chainId].clients.length
    return result
  }

  next() {
    const result = {} as RpcClients
    Object.keys(this.rpcs).forEach(chainId => {
      result[parseInt(chainId)] = this._next(parseInt(chainId))
    })
    return result
  }

  down() {
    if(this.interval) clearInterval(this.interval)
    this.rpcs[mainnet.id].clients.length = 0
    this.rpcs[mainnet.id].pointers.next = 0
    this.rpcs[mainnet.id].pointers.recycle = 0
  }

}

export const rpcs = new pool()
