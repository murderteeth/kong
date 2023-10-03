import React, {useEffect, useRef, useState} from 'react'
import colors from 'tailwindcss/colors'
import {Line} from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData, 
  ChartOptions
} from 'chart.js'
import { fUSD } from '@/util/format'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function Linechart({ title, series }: { title?: string, series: number[] }) {
  const chart = useRef<ChartJS<'line'>>()
  const [data, setData] = useState<ChartData<'line'>>({ datasets: [] })

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title,
        position: 'top',
        align: 'start',
        color: colors.yellow[300]
      }
    },
    animation: {
      duration: 250
    },
    scales: {
      x: {
        display: false
      },
      y: {
        position: 'right',
        grid: {
          display: false
        },
        ticks: {
          color: colors.yellow[700],
          callback: (value: number) => {
            return fUSD(value, { fixed: 0, hideUsd: true })
          }
        }
      }
    },
    elements: {
      point: {
        radius: 0
      },
      line: {
        borderWidth: 1
      }
    }
  } as ChartOptions<'line'>

  function createGradient(ctx: any, area: any) {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);	
    gradient.addColorStop(0, colors.red[950]);
    gradient.addColorStop(1, colors.yellow[400]);
    return gradient;
  }

  useEffect(() => {
    if(chart.current) {
      setData({
        labels: series.map(s => ''),
        datasets: [{
          label: title,
          data: series,
          borderColor: createGradient(chart.current.ctx, chart.current.chartArea),
          backgroundColor: 'transparent',
        }]
      });
    }
  }, [chart, series, title, setData])

  return <Line ref={chart} options={options} data={data} />
}