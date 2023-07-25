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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export interface Price {
  symbol: string,
  price_usd: number,
  block_height: number,
  block_timestamp: string,
  timestamp: string,
}

export default function Prices({prices}: {prices: Price[]}) {
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
        text: 'ETH Price',
        color: colors.red[900]
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
        position: 'left',
        grid: {
          display: false
        },
        ticks: {
          color: colors.red[900],
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
      console.log('wtf')
      setData({
        labels: prices.map(price => ''),
        datasets: [{
          label: 'ETH Price',
          data: prices.map(price => price.price_usd),
          borderColor: createGradient(chart.current.ctx, chart.current.chartArea),
          backgroundColor: 'transparent',
        }]
      });
    }
  }, [chart, prices, setData])

  return <Line ref={chart} options={options} data={data} />
}