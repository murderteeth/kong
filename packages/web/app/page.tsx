import Monitor from '@/components/Monitor'
import Ahoy from '@/components/Ahoy'
import LatestBlocks from '@/components/LatestBlocks'
import Vaults from '@/components/Vaults'
import DataProvider from '@/hooks/useData'

export default function Home() {
  return <main className="w-full flex min-h-screen flex-col items-center gap-2">
    <div className="w-full sm:w-[640px] flex flex-col items-center gap-2">
      <DataProvider>
        <Vaults />
        <LatestBlocks />
        <Monitor />
        <Ahoy />
      </DataProvider>
    </div>
  </main>
}
