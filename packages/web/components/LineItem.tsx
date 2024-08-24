import Frosty from './Frosty'

export function padLineItemValue(value: number) {
  return value.toString().padStart(3, '0')
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
      {padLineItemValue(value)}
    </Frosty>
  </div>
}
