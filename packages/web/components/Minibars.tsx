import { useEffect } from "react"

export default function Minibars({ series, className }: { series: number[], className?: string }) {
	const maxBar = 100
	const maxSeries = Math.max(...series)
	const scale = maxBar / maxSeries
	const bars = series.map(value => Math.round(scale * value) || 1)
	return <div className={`flex items-end gap-1 ${className}`}>
		{bars.map((bar, index) => <div key={index} className={`
			w-2 h-[${bar}%] bg-yellow-300`} />)}
	</div>
}
