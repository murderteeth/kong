import { chains } from 'lib'
import db from '../db'

export default async () => {
  try {
    const networkCounts = chains
    .map(chain => `(SELECT count(*) FROM vault WHERE chain_id = ${chain.id}) AS network_${chain.id}`)
    .join(', ')

    const query = `
    WITH counts AS ( SELECT 
      (SELECT count(*) FROM vault) AS total,
      (SELECT count(*) FROM vault WHERE registry_status = 'endorsed') AS endorsed,
      (SELECT count(*) FROM vault WHERE registry_status = 'experimental') AS experimental,
      ${networkCounts},
      (SELECT count(*) FROM vault WHERE apetax_status = 'stealth') AS apetax_stealth,
      (SELECT count(*) FROM vault WHERE apetax_status = 'new') AS apetax_new,
      (SELECT count(*) FROM vault WHERE apetax_status = 'active') AS apetax_active,
      (SELECT count(*) FROM vault WHERE apetax_status = 'withdraw') AS apetax_withdraw
    )
    SELECT * FROM counts;`

    const data = (await db.query(query)).rows[0]

    return {
      total: data.total,
      endorsed: data.endorsed,
      experimental: data.experimental,
      networks: chains.map(chain => ({
        chainId: chain.id,
        count: data[`network_${chain.id}`]
      })),
      apetax: {
        stealth: data.apetax_stealth,
        new: data.apetax_new,
        active: data.apetax_active,
        withdraw: data.apetax_withdraw
      }
    }
  } catch (error) {
    console.error(error)
    throw new Error('Stats failed')
  }
}
