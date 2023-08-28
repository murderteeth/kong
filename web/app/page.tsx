import Monitor from '@/components/Monitor'
import Ahoy from '@/components/Ahoy'
import LatestBlocks from '@/components/LatestBlocks'
import Vaults from '@/components/Vaults'

export default function Home() {
  return <main className="w-full flex min-h-screen flex-col items-center gap-2">
    <div className="w-full sm:w-1/2 lg:w-1/3 flex flex-col items-center gap-2">
      <Ahoy />
      <Vaults />
      <LatestBlocks />
      <Monitor />
    </div>
  </main>
}
