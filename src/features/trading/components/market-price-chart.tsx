import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
} from 'lightweight-charts'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import {
  buildOlderChartHistoryRequest,
  computePrependedLogicalRange,
} from '../lib/chart-history'
import { CHART_HISTORY_REQUEST_DEBOUNCE_MS } from '../constants'
import type {
  CandlestickData,
  HistogramData,
  IChartApi,
  ISeriesApi,
  Logical,
  LogicalRange,
  UTCTimestamp,
} from 'lightweight-charts'
import type { LogicalRangeLike } from '../lib/chart-history'
import type { TradingViewAggregatedCandle } from '../lib/market'

export interface ChartCrosshairData {
  close: number
  high: number
  low: number
  open: number
  time: number
  volume: number | null
}

export interface ChartHistoryRequest {
  visibleBarCount: number
}

function buildDefaultLogicalRange(
  dataLength: number,
  visibleBars: number,
): LogicalRange | null {
  if (dataLength <= 0 || visibleBars <= 0) {
    return null
  }

  if (dataLength <= visibleBars) {
    return null
  }

  return {
    from: Math.max(-0.5, dataLength - visibleBars) as Logical,
    to: (dataLength - 1 + 8) as Logical,
  }
}

function isSameCrosshairData(
  left: ChartCrosshairData | null,
  right: ChartCrosshairData | null,
) {
  if (left === right) {
    return true
  }

  if (left === null || right === null) {
    return false
  }

  return (
    left.close === right.close &&
    left.high === right.high &&
    left.low === right.low &&
    left.open === right.open &&
    left.time === right.time &&
    left.volume === right.volume
  )
}

export function MarketPriceChart({
  defaultVisibleBars = 120,
  data,
  height = 420,
  hasMoreHistory = false,
  isLoadingMoreHistory = false,
  onCrosshairMove,
  onNeedOlderHistory,
  resetSignal = 0,
  viewportPresetKey = 'default',
}: {
  defaultVisibleBars?: number
  data: Array<TradingViewAggregatedCandle>
  height?: number
  hasMoreHistory?: boolean
  isLoadingMoreHistory?: boolean
  onCrosshairMove?: (value: ChartCrosshairData | null) => void
  onNeedOlderHistory?: (request: ChartHistoryRequest) => void
  resetSignal?: number
  viewportPresetKey?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const previousDataLengthRef = useRef(0)
  const previousFirstTimeRef = useRef<number | null>(null)
  const previousLastTimeRef = useRef<number | null>(null)
  const activePanGestureRef = useRef(false)
  const hasUserInteractedRef = useRef(false)
  const isAdjustingVisibleRangeRef = useRef(false)
  const lastHistoryRequestAtRef = useRef(0)
  const lastLogicalRangeRef = useRef<LogicalRange | null>(null)
  const wheelGestureTimeoutRef = useRef<number | null>(null)
  const lastCrosshairDataRef = useRef<ChartCrosshairData | null>(null)
  const previousViewportPresetKeyRef = useRef(viewportPresetKey)

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

  const handleCrosshairMove = useEffectEvent(
    (payload: ChartCrosshairData | null) => {
      if (isSameCrosshairData(lastCrosshairDataRef.current, payload)) {
        return
      }

      lastCrosshairDataRef.current = payload
      onCrosshairMove?.(payload)
    },
  )
  const handleNeedOlderHistory = useEffectEvent(
    (range: LogicalRange | null) => {
      if (
        !range ||
        !activePanGestureRef.current ||
        isAdjustingVisibleRangeRef.current
      ) {
        return
      }
      if (!hasMoreHistory || isLoadingMoreHistory || !onNeedOlderHistory) {
        return
      }

      const previousRange = lastLogicalRangeRef.current
      lastLogicalRangeRef.current = range

      if (!previousRange) {
        return
      }

      const previousSpan = previousRange.to - previousRange.from
      const nextSpan = range.to - range.from
      const isScaleChange = Math.abs(nextSpan - previousSpan) > 0.01
      const movedLeft = range.from < previousRange.from - 0.25

      if (isScaleChange || !movedLeft || !candleSeriesRef.current) {
        return
      }

      const now = Date.now()
      if (
        now - lastHistoryRequestAtRef.current <
        CHART_HISTORY_REQUEST_DEBOUNCE_MS
      ) {
        return
      }

      const barsInfo = candleSeriesRef.current.barsInLogicalRange(range)
      const request = buildOlderChartHistoryRequest({
        barsBefore: barsInfo?.barsBefore ?? null,
        data,
        logicalRange: range,
      })
      if (request === null) {
        return
      }

      lastHistoryRequestAtRef.current = now
      onNeedOlderHistory(request)
    },
  )
  const applyVisibleLogicalRange = useEffectEvent(
    (range: LogicalRangeLike | null) => {
      if (!chartRef.current || !range) {
        return
      }

      isAdjustingVisibleRangeRef.current = true
      chartRef.current.timeScale().setVisibleLogicalRange(range as LogicalRange)
      isAdjustingVisibleRangeRef.current = false
      lastLogicalRangeRef.current = chartRef.current
        .timeScale()
        .getVisibleLogicalRange()
    },
  )
  const applyDefaultViewport = useEffectEvent(() => {
    if (!chartRef.current || data.length === 0) {
      return
    }

    const nextRange = buildDefaultLogicalRange(data.length, defaultVisibleBars)

    isAdjustingVisibleRangeRef.current = true

    if (nextRange) {
      chartRef.current.timeScale().setVisibleLogicalRange(nextRange)
    } else {
      chartRef.current.timeScale().fitContent()
    }

    isAdjustingVisibleRangeRef.current = false
    lastLogicalRangeRef.current = chartRef.current
      .timeScale()
      .getVisibleLogicalRange()
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
        horzTouchDrag: true,
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
        fixLeftEdge: true,
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
        ? (param.seriesData.get(volumeSeriesRef.current) as
            | { value: number }
            | undefined)
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

    const clearPanGesture = () => {
      activePanGestureRef.current = false
      if (wheelGestureTimeoutRef.current !== null) {
        window.clearTimeout(wheelGestureTimeoutRef.current)
        wheelGestureTimeoutRef.current = null
      }
    }

    const handlePointerDown = () => {
      activePanGestureRef.current = true
      hasUserInteractedRef.current = true
    }
    const handleTouchStart = (event: TouchEvent) => {
      activePanGestureRef.current = event.touches.length === 1
      if (event.touches.length > 0) {
        hasUserInteractedRef.current = true
      }
    }
    const handleTouchEnd = () => {
      activePanGestureRef.current = false
    }
    const handleWheel = (event: WheelEvent) => {
      hasUserInteractedRef.current = true
      activePanGestureRef.current =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      if (!activePanGestureRef.current) {
        return
      }
      if (wheelGestureTimeoutRef.current !== null) {
        window.clearTimeout(wheelGestureTimeoutRef.current)
      }
      wheelGestureTimeoutRef.current = window.setTimeout(() => {
        activePanGestureRef.current = false
        wheelGestureTimeoutRef.current = null
      }, 120)
    }

    containerRef.current.addEventListener('pointerdown', handlePointerDown, {
      passive: true,
    })
    window.addEventListener('pointerup', clearPanGesture)
    window.addEventListener('pointercancel', clearPanGesture)
    containerRef.current.addEventListener('wheel', handleWheel, {
      passive: true,
    })
    containerRef.current.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })
    containerRef.current.addEventListener('touchend', handleTouchEnd, {
      passive: true,
    })
    containerRef.current.addEventListener('touchcancel', handleTouchEnd, {
      passive: true,
    })

    const resizeObserver = new ResizeObserver(() => {
      chart.timeScale().applyOptions({ rightOffset: 8 })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      containerRef.current?.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )
      window.removeEventListener('pointerup', clearPanGesture)
      window.removeEventListener('pointercancel', clearPanGesture)
      containerRef.current?.removeEventListener('wheel', handleWheel)
      containerRef.current?.removeEventListener('touchstart', handleTouchStart)
      containerRef.current?.removeEventListener('touchend', handleTouchEnd)
      containerRef.current?.removeEventListener('touchcancel', handleTouchEnd)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      previousDataLengthRef.current = 0
      previousFirstTimeRef.current = null
      previousLastTimeRef.current = null
      activePanGestureRef.current = false
      hasUserInteractedRef.current = false
      isAdjustingVisibleRangeRef.current = false
      lastHistoryRequestAtRef.current = 0
      lastLogicalRangeRef.current = null
      lastCrosshairDataRef.current = null
      if (wheelGestureTimeoutRef.current !== null) {
        window.clearTimeout(wheelGestureTimeoutRef.current)
        wheelGestureTimeoutRef.current = null
      }
    }
  }, [height])

  useEffect(() => {
    if (
      !candleSeriesRef.current ||
      !volumeSeriesRef.current ||
      !chartRef.current
    )
      return
    const previousRange = chartRef.current.timeScale().getVisibleLogicalRange()
    const previousLength = previousDataLengthRef.current
    const previousFirstTime = previousFirstTimeRef.current
    const previousLastTime = previousLastTimeRef.current
    const viewportPresetChanged =
      previousViewportPresetKeyRef.current !== viewportPresetKey

    const hadNoData = previousLength === 0
    const nextFirstTime = data[0]?.time ?? null
    const nextLastTime = data[data.length - 1]?.time ?? null

    previousViewportPresetKeyRef.current = viewportPresetKey
    previousDataLengthRef.current = data.length
    previousFirstTimeRef.current = nextFirstTime
    previousLastTimeRef.current = nextLastTime

    if (data.length > 0) {
      if (hadNoData) {
        candleSeriesRef.current.setData(candleData)
        volumeSeriesRef.current.setData(histogramData)
        applyDefaultViewport()
        return
      }

      const nextRange = computePrependedLogicalRange({
        nextFirstTime,
        nextLastTime,
        nextLength: data.length,
        previousFirstTime,
        previousLastTime,
        previousLength,
        previousRange,
      })

      if (nextRange) {
        candleSeriesRef.current.setData(candleData)
        volumeSeriesRef.current.setData(histogramData)
        if (hasUserInteractedRef.current) {
          applyVisibleLogicalRange(nextRange)
        } else {
          applyDefaultViewport()
        }
        return
      }

      if (viewportPresetChanged) {
        candleSeriesRef.current.setData(candleData)
        volumeSeriesRef.current.setData(histogramData)
        applyDefaultViewport()
        return
      }

      const canApplyIncrementalUpdate =
        previousFirstTime === nextFirstTime &&
        previousLastTime !== null &&
        nextLastTime >= previousLastTime

      if (canApplyIncrementalUpdate) {
        const startIndex = data.findIndex(
          (candle) => candle.time >= previousLastTime,
        )

        if (startIndex >= 0) {
          for (let index = startIndex; index < candleData.length; index += 1) {
            candleSeriesRef.current.update(candleData[index])
            volumeSeriesRef.current.update(histogramData[index])
          }

          lastLogicalRangeRef.current = chartRef.current
            .timeScale()
            .getVisibleLogicalRange()
          return
        }
      }

      candleSeriesRef.current.setData(candleData)
      volumeSeriesRef.current.setData(histogramData)

      if (!hasUserInteractedRef.current) {
        applyDefaultViewport()
        return
      }

      if (previousRange) {
        applyVisibleLogicalRange(previousRange)
        return
      }

      lastLogicalRangeRef.current = chartRef.current
        .timeScale()
        .getVisibleLogicalRange()
      return
    }

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(histogramData)
    previousFirstTimeRef.current = null
    previousLastTimeRef.current = null
    lastLogicalRangeRef.current = null
    handleCrosshairMove(null)
  }, [candleData, data.length, histogramData, viewportPresetKey])

  useEffect(() => {
    if (resetSignal <= 0) return
    if (!chartRef.current) return
    hasUserInteractedRef.current = false
    applyDefaultViewport()
  }, [resetSignal])

  useEffect(() => {
    hasUserInteractedRef.current = false
  }, [viewportPresetKey])

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <div ref={containerRef} className="h-full min-h-[420px] w-full" />
      {isLoadingMoreHistory ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Loading older history...
        </div>
      ) : null}
    </div>
  )
}
