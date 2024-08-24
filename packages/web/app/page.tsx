import Ahoy from '@/components/Ahoy'
import LatestBlocks from '@/components/LatestBlocks'
import Vaults from '@/components/Vaults'
import Filler from '@/components/Filler'
import MessageQueue from '@/components/MessageQueue'
import MessageQueueRedis from '@/components/MessageQueueRedis'
import Postgres from '@/components/Postgres'

export default function Home() {
  return <main className="relative w-full min-h-screen sm:h-screen flex justify-center">
    <Filler className="hidden sm:block fixed -z-[1] w-[30%] h-screen top-0 left-0 text-emerald-950" />
    <div className="w-full sm:w-[40%] px-4 sm:px-8 pt-4 flex flex-col items-center justify-start gap-8">
      <Ahoy />
      <LatestBlocks />
      <MessageQueue />
      <MessageQueueRedis />
      <Postgres />
      <Vaults />
      <div className="text-[1px] block">&nbsp;</div>
    </div>
    <Filler className="hidden sm:block fixed -z-[1] w-[30%] h-screen top-0 right-0 text-emerald-950" />
  </main>
}
