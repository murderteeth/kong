import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'
import { keccak256, toBytes } from 'viem'

export interface ContractSource {
  chainId: number,
  address: '0x${string}',
  incept: bigint
}

export interface Contract {
  abi: string
  schedule: string
  start?: boolean
  thing?: boolean
  source?: ContractSource[]
  fromIncept?: boolean
}

interface YamlConfig {
  contracts: Contract[]
}

const yamlPath = (() => {
  const local = path.join(__dirname, '../../config', 'contracts.local.yaml')
  const production = path.join(__dirname, '../../config', 'contracts.yaml')
  if(fs.existsSync(local)) return local
  return production
})()

const yamlFile = fs.readFileSync(yamlPath, 'utf8')
const config = yaml.load(yamlFile) as YamlConfig
const contracts = config.contracts.map(contract => ({
  ...contract,
  id: keccak256(toBytes(JSON.stringify(contract)))
}))

export { contracts }
export default contracts
