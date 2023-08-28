import LatestBlock from '../components/LatestBlock'
import Ahoy from '../components/Ahoy'

export default function Home() {
  return <main className="flex min-h-screen flex-col items-center gap-2">
    <Ahoy />
    <LatestBlock />
  </main>
}
