import { gql } from 'apollo-server-express'
import latestBlock from './latestBlock'
import strategy from './strategy'
import vault from './vault'
import monitorResults from './monitorResults'

const query = gql`
  scalar BigInt

  type Query {
    bananas: String,
    latestBlocks(chainId: Int): [LatestBlock],
    vaults(chainId: Int): [Vault],
    monitor: MonitorResults
  }
`

export default [
  query, 
  latestBlock, 
  strategy, 
  vault, 
  monitorResults
]
