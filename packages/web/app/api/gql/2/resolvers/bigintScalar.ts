import { GraphQLScalarType, Kind } from 'graphql'

export const bigintScalar = new GraphQLScalarType({
  name: 'BigInt',
  description: 'BigInt override',
  serialize(value) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') {
      return value.toString()
    }
    throw new Error('expected number | string | bigint')
  },
  parseValue(value) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') {
      return BigInt(value)
    }
    throw new Error('expected number | string | bigint')
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      return BigInt(ast.value)
    }
    throw new Error('expected Kind.INT | Kind.STRING')
  },
})
