import { useCallback } from 'react'
import { useMediumBreakpoint } from '@/hooks/useMediumBreakpoint'

export default function Connector({ name, index, padding }: { name: string, index: number, padding: { default: number, sm: number} }) {
  const mb = useMediumBreakpoint()
  const connector = useCallback((name: string) => {
    const pad = mb ? padding.sm : padding.default
    const padded = name.padStart(pad, '.^')
    return padded.replace(name, '')
  }, [mb, padding])
  return <div className={index % 2 === 0 ? 'text-green-950' : 'text-green-900'}>{connector(name)}</div>
}
