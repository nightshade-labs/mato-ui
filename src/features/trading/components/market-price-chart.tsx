import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import type { TradingViewAggregatedCandle } from '../lib/market'

export interface ChartCrosshairData {
  close: number
  high: number
  low: number
  open: number
  time: number
  volume: number | null
}

export function MarketPriceChart({
  data,
  height = 420,
  onCrosshairMove,
  resetSignal = 0,
}: {
  data: TradingViewAggregatedCandle[]
  height?: number
  onCrosshairMove?: (value: ChartCrosshairData | null) => void
  resetSignal?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const previousDataLengthRef = useRef(0)

  const histogramData = useMemo(
    () =>
      data.map<HistogramData<UTCTimestamp>>((candle) => ({
        color: candle.close >= candle.open ? '#43c29a55' : '#f86f7055',
        time: candle.time as UTCTimestamp,
        value: candle.volume,
      })),
    [data],
  )
  const candleData = useMemo(
    () =>
      data.map<CandlestickData<UTCTimestamp>>((candle) => ({
        close: candle.close,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        time: candle.time as UTCTimestamp,
      })),
    [data],
  )

  const handleCrosshairMove = useEffectEvent((payload: ChartCrosshairData | null) => {
    onCrosshairMove?.(payload)
  })

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      grid: {
        horzLines: { color: 'rgba(255,255,255,0.06)' },
        vertLines: { color: 'rgba(255,255,255,0.04)' },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      height,
      layout: {
        background: {
          color: 'rgba(7, 17, 31, 0)',
          type: ColorType.Solid,
        },
        textColor: 'rgba(233,239,245,0.75)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.12)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.12)',
        timeVisible: true,
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      borderDownColor: '#f86f70',
      borderUpColor: '#43c29a',
      downColor: '#f86f70',
      wickDownColor: '#f86f70',
      wickUpColor: '#43c29a',
      upColor: '#43c29a',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })

    chart.priceScale('').applyOptions({
      scaleMargins: {
        bottom: 0,
        top: 0.8,
      },
    })
    chart.timeScale().applyOptions({ rightOffset: 8 })

    chart.subscribeCrosshairMove((param) => {
      if (!candleSeriesRef.current) {
        handleCrosshairMove(null)
        return
      }

      const candle = param.seriesData.get(candleSeriesRef.current) as
        | { close: number; high: number; low: number; open: number }
        | undefined
      const volume = volumeSeriesRef.current
        ? (param.seriesData.get(volumeSeriesRef.current) as { value: number } | undefined)
        : undefined

      if (!candle || param.time === undefined) {
        handleCrosshairMove(null)
        return
      }

      handleCrosshairMove({
        close: candle.close,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        time: Number(param.time),
        volume: volume?.value ?? null,
      })
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    const resizeObserver = new ResizeObserver(() => {
      chart.timeScale().applyOptions({ rightOffset: 8 })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      previousDataLengthRef.current = 0
    }
  }, [handleCrosshairMove, height])

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return
    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(histogramData)

    const hadNoData = previousDataLengthRef.current === 0
    previousDataLengthRef.current = data.length

    if (data.length > 0) {
      if (hadNoData) {
        chartRef.current?.timeScale().fitContent()
      }
      return
    }

    handleCrosshairMove(null)
  }, [candleData, data.length, handleCrosshairMove, histogramData])

  useEffect(() => {
    if (resetSignal <= 0) return
    chartRef.current?.timeScale().fitContent()
  }, [resetSignal])

  return <div ref={containerRef} className="h-full min-h-[420px] w-full" />
}
