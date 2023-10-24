import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'
import { arbitrum, base, fantom, mainnet, optimism, polygon } from 'viem/chains'
const viemchains = { arbitrum, base, fantom, mainnet, optimism, polygon }

interface YamlConfig { chains: string [] }

const yamlFile = fs.readFileSync(path.join(__dirname, 'chains.yaml'), 'utf8')
const config = yaml.load(yamlFile) as YamlConfig
const chains = config.chains.map(name => {
  const viemchain = viemchains[name as keyof typeof viemchains]
  if(!viemchain) throw new Error(`chain not found, ${name}`)
  return viemchain
})

export { chains }
export default chains
