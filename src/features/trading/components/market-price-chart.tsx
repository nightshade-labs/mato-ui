import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  CandlestickSeries,
  type LogicalRange,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import type { TradingViewAggregatedCandle } from '../lib/market'
import {
  buildOlderChartHistoryRequest,
  computePrependedLogicalRange,
} from '../lib/chart-history'
import { CHART_HISTORY_REQUEST_DEBOUNCE_MS } from '../constants'

export interface ChartCrosshairData {
  close: number
  high: number
  low: number
  open: number
  time: number
  volume: number | null
}

export interface ChartHistoryRequest {
  oldestVisibleCandle: TradingViewAggregatedCandle
  visibleBarCount: number
}

export function MarketPriceChart({
  data,
  height = 420,
  hasMoreHistory = false,
  isLoadingMoreHistory = false,
  onCrosshairMove,
  onNeedOlderHistory,
  resetSignal = 0,
}: {
  data: TradingViewAggregatedCandle[]
  height?: number
  hasMoreHistory?: boolean
  isLoadingMoreHistory?: boolean
  onCrosshairMove?: (value: ChartCrosshairData | null) => void
  onNeedOlderHistory?: (request: ChartHistoryRequest) => void
  resetSignal?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const previousDataLengthRef = useRef(0)
  const previousFirstTimeRef = useRef<number | null>(null)
  const previousLastTimeRef = useRef<number | null>(null)
  const hasUserScrollIntentRef = useRef(false)
  const isAdjustingVisibleRangeRef = useRef(false)
  const lastHistoryRequestAtRef = useRef(0)

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
  const handleNeedOlderHistory = useEffectEvent((range: LogicalRange | null) => {
    if (!range || !hasUserScrollIntentRef.current || isAdjustingVisibleRangeRef.current) {
      return
    }
    if (!hasMoreHistory || isLoadingMoreHistory || !onNeedOlderHistory) {
      return
    }

    const now = Date.now()
    if (now - lastHistoryRequestAtRef.current < CHART_HISTORY_REQUEST_DEBOUNCE_MS) {
      return
    }

    const request = buildOlderChartHistoryRequest({
      data,
      logicalRange: range,
    })
    if (request === null) {
      return
    }

    lastHistoryRequestAtRef.current = now
    onNeedOlderHistory(request)
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
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      handleNeedOlderHistory(range)
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    const handleUserScrollIntent = () => {
      hasUserScrollIntentRef.current = true
    }

    containerRef.current.addEventListener('pointerdown', handleUserScrollIntent, { passive: true })
    containerRef.current.addEventListener('wheel', handleUserScrollIntent, { passive: true })
    containerRef.current.addEventListener('touchstart', handleUserScrollIntent, { passive: true })

    const resizeObserver = new ResizeObserver(() => {
      chart.timeScale().applyOptions({ rightOffset: 8 })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      containerRef.current?.removeEventListener('pointerdown', handleUserScrollIntent)
      containerRef.current?.removeEventListener('wheel', handleUserScrollIntent)
      containerRef.current?.removeEventListener('touchstart', handleUserScrollIntent)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      previousDataLengthRef.current = 0
      previousFirstTimeRef.current = null
      previousLastTimeRef.current = null
      hasUserScrollIntentRef.current = false
      isAdjustingVisibleRangeRef.current = false
      lastHistoryRequestAtRef.current = 0
    }
  }, [handleCrosshairMove, handleNeedOlderHistory, height])

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return
    const previousRange = chartRef.current.timeScale().getVisibleLogicalRange()
    const previousLength = previousDataLengthRef.current
    const previousFirstTime = previousFirstTimeRef.current
    const previousLastTime = previousLastTimeRef.current

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(histogramData)

    const hadNoData = previousLength === 0
    previousDataLengthRef.current = data.length
    previousFirstTimeRef.current = data[0]?.time ?? null
    previousLastTimeRef.current = data[data.length - 1]?.time ?? null

    if (data.length > 0) {
      if (hadNoData) {
        isAdjustingVisibleRangeRef.current = true
        chartRef.current.timeScale().fitContent()
        isAdjustingVisibleRangeRef.current = false
        return
      }

      const nextRange = computePrependedLogicalRange({
        nextFirstTime: data[0]?.time ?? null,
        nextLastTime: data[data.length - 1]?.time ?? null,
        nextLength: data.length,
        previousFirstTime,
        previousLastTime,
        previousLength,
        previousRange,
      })

      if (nextRange) {
        isAdjustingVisibleRangeRef.current = true
        chartRef.current.timeScale().setVisibleLogicalRange(nextRange)
        isAdjustingVisibleRangeRef.current = false
      }
      return
    }

    previousFirstTimeRef.current = null
    previousLastTimeRef.current = null
    handleCrosshairMove(null)
  }, [candleData, data.length, handleCrosshairMove, histogramData])

  useEffect(() => {
    if (resetSignal <= 0) return
    if (!chartRef.current) return
    isAdjustingVisibleRangeRef.current = true
    chartRef.current.timeScale().fitContent()
    isAdjustingVisibleRangeRef.current = false
  }, [resetSignal])

  return <div ref={containerRef} className="h-full min-h-[420px] w-full" />
}
