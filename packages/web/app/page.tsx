import Monitor from '@/components/Monitor'
import Ahoy from '@/components/Ahoy'
import LatestBlocks from '@/components/LatestBlocks'
import Vaults from '@/components/Vaults'
import DataProvider from '@/hooks/useData'

export default function Home() {
  return <DataProvider>
    <main className="w-full min-h-screen px-8 flex">
      <div className="w-1/3">
        <Ahoy />
        <Monitor />
      </div>
      <div className="w-1/3">
        <LatestBlocks />
        <Vaults />
      </div>
    </main>
  </DataProvider>
}
