import Monitor from '@/components/Monitor'
import Ahoy from '@/components/Ahoy'
import LatestBlocks from '@/components/LatestBlocks'
import Vaults from '@/components/Vaults'
import DataProvider from '@/hooks/useData'
import Deposits from '@/components/Deposits'
import Vault from '@/components/Vault'

export default function Home() {
  return <DataProvider>
    <main className="w-full min-h-screen px-8 flex gap-2">
      <div className="w-1/3">
        <Ahoy />
        <LatestBlocks />
        <Monitor />
      </div>
      <div className="w-1/3">
        <Vaults />
        <Vault />
      </div>
      <div className="w-1/3">
        <Deposits />
      </div>
    </main>
  </DataProvider>
}
