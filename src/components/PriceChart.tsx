import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  CandlestickSeries,
  ColorType,
} from 'lightweight-charts'
import type { MarketUpdateEvent } from '@/integrations/supabase'
import {
  marketUpdatesToCandles,
  TIME_INTERVALS,
  type TimeInterval,
} from '@/lib/chart-utils'

interface PriceChartProps {
  marketUpdates: MarketUpdateEvent[]
  baseDecimals: number
  quoteDecimals: number
  baseSymbol?: string
  quoteSymbol?: string
}

export default function PriceChart({
  marketUpdates,
  baseDecimals,
  quoteDecimals,
  baseSymbol = 'BASE',
  quoteSymbol = 'QUOTE',
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [interval, setInterval] = useState<TimeInterval>('1h')

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1f2937' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      crosshair: {
        mode: 1,
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return

    const candles = marketUpdatesToCandles(
      marketUpdates,
      interval,
      baseDecimals,
      quoteDecimals,
    )

    seriesRef.current.setData(candles)

    if (chartRef.current && candles.length > 0) {
      chartRef.current.timeScale().fitContent()
    }
  }, [marketUpdates, interval, baseDecimals, quoteDecimals])

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {baseSymbol}/{quoteSymbol}
        </h3>
        <div className="flex gap-1">
          {TIME_INTERVALS.map((ti) => (
            <button
              key={ti.value}
              onClick={() => setInterval(ti.value)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                interval === ti.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {ti.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
      {marketUpdates.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          No market data available
        </div>
      )}
    </div>
  )
}
