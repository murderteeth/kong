import { fFixed } from '@/lib/format'
import Frosty from './Frosty'

export function formatLineItemValue(value: number) {
  const asString = value.toString()
  if (asString.length < 3) return asString.padStart(3, '0')
  return fFixed(value, { accuracy: 0 }).toString()
}

export default function LineItem({
  label,
  value,
  className = ''
}: {
  label: string
  value: number
  className?: string
}) {
  return <div className={`w-full flex items-center justify-between text-yellow-700 ${className}`}>
    <div className="whitespace-nowrap">{label}</div>
    <Frosty _key={`thing_vault_total-${value}`} disabled={value < 1}>
      {formatLineItemValue(value)}
    </Frosty>
  </div>
}
