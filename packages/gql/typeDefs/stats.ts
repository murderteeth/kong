import gql from 'graphql-tag'

export default gql`
type NetworkStat {
  chainId: Int!
  count: Int!
}

type ApetaxStat {
  stealth: Int!
  new: Int!
  active: Int!
  withdraw: Int!
}

type Stats {
  total: Int!
  endorsed: Int!
  experimental: Int!
  networks: [NetworkStat]!
  apetax: ApetaxStat!
}
`
