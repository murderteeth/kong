import gql from 'graphql-tag'

export const PERIOD = {
  ONE_DAY: '1 day',
  SEVEN_DAY: '7 day'
} as { [key: string]: string }

export default gql`
enum Period {
  ONE_DAY
  SEVEN_DAY
}
`
