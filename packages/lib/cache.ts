import { Cache, caching } from 'cache-manager'
import { redisStore } from 'cache-manager-redis-yet'

class __Cache {
  private __store: { client: { quit: () => Promise<string> } } | undefined
  private __cache: Cache | undefined

  get del() {
    return (this.__cache as Cache).del.bind(this.__cache)
  }

  get get() {
    return (this.__cache as Cache).get.bind(this.__cache)
  }

  get reset() {
    return (this.__cache as Cache).reset.bind(this.__cache)
  }

  get set() {
    return (this.__cache as Cache).set.bind(this.__cache)
  }

  get wrap() {
    return (this.__cache as Cache).wrap.bind(this.__cache)
  }

  async up() {
    this.__store = await redisStore({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: (process.env.REDIS_PORT || 6379) as number,
      }
    })
    this.__cache = await caching(this.__store as any)
  }

  async down() {
    await this.__store?.client.quit()
  }
}

export const cache = new __Cache()
