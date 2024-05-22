import { mq } from 'lib'
import manuals from 'lib/manuals'

export class ManualsExtractor {
  async extract() {
    for (const manual of manuals) {
      await mq.add(mq.job.load.thing, manual)
    }
  }
}
