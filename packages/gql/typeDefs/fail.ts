import { gql } from 'apollo-server-express'

export default gql`
type Fail {
  id: String
  name: String
  data: String
  timestamp: String
  failedReason: String
  stacktrace: [String]
}
`
