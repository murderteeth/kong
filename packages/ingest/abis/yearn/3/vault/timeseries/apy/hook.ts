import { Data, Result } from '../../../../../../extract/timeseries'
import _process, { _compute } from '../../../../lib/apy'

export const outputLabel = 'apy-bwd-delta-pps'

export default async function process(chainId: number, address: `0x${string}`, data: Data): Promise<Result[]> {
  return _process(chainId, address, 'vault', data)
}
