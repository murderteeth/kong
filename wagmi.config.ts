import { defineConfig } from '@wagmi/cli'
import { etherscan } from '@wagmi/cli/plugins'
import { mainnet } from 'viem/chains'

export default defineConfig({
  out: '.generated/wagmi.ts',
  plugins: [
    etherscan({
      chainId: mainnet.id,
      apiKey: process.env.ETHERSCAN_API_KEY as string,
      contracts: [
        {
          name: 'oracle',
          address: '0x9b8b9F6146B29CC32208f42b995E70F0Eb2807F3',
        },
      ],
    })
  ]
})
