import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
} from 'lightweight-charts'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
  ITimeScaleApi,
  Logical,
  LogicalRange,
  UTCTimestamp,
} from 'lightweight-charts'
import type { LogicalRangeLike } from '../lib/chart-history'
import type { ChartPositionOverlay } from '../lib/chart-positions'
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

const MIN_VALID_UNIX_TIME_SECONDS = 946684800 // 2000-01-01T00:00:00Z
const MAX_VALID_UNIX_TIME_SECONDS = 4102444800 // 2100-01-01T00:00:00Z
const MAX_LIGHTWEIGHT_CHART_ABS_VALUE = 90_071_992_547_409.91
const POSITION_BADGE_HEIGHT = 24
const POSITION_BADGE_GAP = 4

interface ProjectedPositionOverlay extends ChartPositionOverlay {
  badgeLeft: number
  badgeTop: number
  endX: number
  lineColor: string
  startX: number
  width: number
  y: number
}

function normalizeUnixTimeSeconds(rawTime: number) {
  if (!Number.isFinite(rawTime) || rawTime <= 0) {
    return null
  }

  const candidates = [
    rawTime,
    rawTime / 1_000,
    rawTime / 1_000_000,
    rawTime / 1_000_000_000,
  ]

  for (const candidate of candidates) {
    const normalized = Math.floor(candidate)
    if (
      normalized >= MIN_VALID_UNIX_TIME_SECONDS &&
      normalized <= MAX_VALID_UNIX_TIME_SECONDS
    ) {
      return normalized
    }
  }

  return null
}

function isSafeChartNumber(value: number) {
  return (
    Number.isFinite(value) && Math.abs(value) <= MAX_LIGHTWEIGHT_CHART_ABS_VALUE
  )
}

function sanitizeChartCandles(data: Array<TradingViewAggregatedCandle>) {
  const normalized = data
    .map<TradingViewAggregatedCandle | null>((candle) => {
      const time = normalizeUnixTimeSeconds(candle.time)
      if (time === null) {
        return null
      }
      if (
        !isSafeChartNumber(candle.open) ||
        !isSafeChartNumber(candle.high) ||
        !isSafeChartNumber(candle.low) ||
        !isSafeChartNumber(candle.close)
      ) {
        return null
      }
      if (
        candle.open <= 0 ||
        candle.high <= 0 ||
        candle.low <= 0 ||
        candle.close <= 0
      ) {
        return null
      }

      const normalizedHigh = Math.max(
        candle.open,
        candle.high,
        candle.low,
        candle.close,
      )
      const normalizedLow = Math.min(
        candle.open,
        candle.high,
        candle.low,
        candle.close,
      )
      const normalizedVolume =
        isSafeChartNumber(candle.volume) && candle.volume >= 0
          ? candle.volume
          : 0

      return {
        ...candle,
        high: normalizedHigh,
        low: normalizedLow,
        time,
        volume: normalizedVolume,
      }
    })
    .filter((candle): candle is TradingViewAggregatedCandle => candle !== null)
    .sort((left, right) => {
      if (left.time === right.time) {
        return left.endSlot - right.endSlot
      }
      return left.time - right.time
    })

  const deduped: Array<TradingViewAggregatedCandle> = []
  for (const candle of normalized) {
    const previous = deduped.at(-1)
    if (previous && previous.time === candle.time) {
      if (candle.endSlot >= previous.endSlot) {
        deduped[deduped.length - 1] = candle
      }
      continue
    }

    deduped.push(candle)
  }

  return deduped
}

function getInterpolatedTimeCoordinate({
  chartData,
  time,
  timeScale,
}: {
  chartData: Array<TradingViewAggregatedCandle>
  time: number
  timeScale: ITimeScaleApi<UTCTimestamp>
}) {
  const directCoordinate = timeScale.timeToCoordinate(time as UTCTimestamp)
  if (directCoordinate !== null) {
    return directCoordinate
  }

  if (chartData.length === 0) return null

  const upperIndex = chartData.findIndex((candle) => candle.time >= time)
  if (upperIndex >= 0 && chartData[upperIndex].time === time) {
    return timeScale.timeToCoordinate(
      chartData[upperIndex].time as UTCTimestamp,
    )
  }

  const left =
    upperIndex < 0
      ? chartData.at(-2)
      : upperIndex === 0
        ? chartData[0]
        : chartData[upperIndex - 1]
  const right =
    upperIndex < 0
      ? chartData.at(-1)
      : upperIndex === 0
        ? chartData[1]
        : chartData[upperIndex]

  if (!left || !right || left.time === right.time) {
    return null
  }

  const leftX = timeScale.timeToCoordinate(left.time as UTCTimestamp)
  const rightX = timeScale.timeToCoordinate(right.time as UTCTimestamp)
  if (leftX === null || rightX === null) {
    return null
  }

  const ratio = (time - left.time) / (right.time - left.time)
  return leftX + (rightX - leftX) * ratio
}

function estimateBadgeWidth(label: string) {
  return Math.min(168, Math.max(80, label.length * 7 + 24))
}

function boxesOverlap(
  left: { bottom: number; left: number; right: number; top: number },
  right: { bottom: number; left: number; right: number; top: number },
) {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  )
}

function stackPositionBadges({
  bounds,
  overlays,
}: {
  bounds: { height: number; width: number }
  overlays: Array<Omit<ProjectedPositionOverlay, 'badgeLeft' | 'badgeTop'>>
}): Array<ProjectedPositionOverlay> {
  const occupied: Array<{
    bottom: number
    left: number
    right: number
    top: number
  }> = []

  return [...overlays]
    .sort((left, right) => {
      if (Math.abs(left.startX - right.startX) < 1) return left.y - right.y
      return left.startX - right.startX
    })
    .map((overlay) => {
      const badgeWidth = estimateBadgeWidth(overlay.label)
      const badgeLeft = Math.min(
        Math.max(overlay.startX - badgeWidth / 2, 4),
        Math.max(4, bounds.width - badgeWidth - 4),
      )
      const preferredTop = Math.min(
        Math.max(overlay.y - POSITION_BADGE_HEIGHT - 8, 4),
        Math.max(4, bounds.height - POSITION_BADGE_HEIGHT - 4),
      )
      let badgeTop = preferredTop

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const candidate = {
          bottom: badgeTop + POSITION_BADGE_HEIGHT,
          left: badgeLeft,
          right: badgeLeft + badgeWidth,
          top: badgeTop,
        }
        if (!occupied.some((box) => boxesOverlap(candidate, box))) {
          occupied.push(candidate)
          return {
            ...overlay,
            badgeLeft,
            badgeTop,
            width: badgeWidth,
          }
        }

        const nextTop =
          attempt < 6
            ? preferredTop -
              (attempt + 1) * (POSITION_BADGE_HEIGHT + POSITION_BADGE_GAP)
            : preferredTop +
              (attempt - 5) * (POSITION_BADGE_HEIGHT + POSITION_BADGE_GAP)
        badgeTop = Math.min(
          Math.max(nextTop, 4),
          Math.max(4, bounds.height - POSITION_BADGE_HEIGHT - 4),
        )
      }

      occupied.push({
        bottom: badgeTop + POSITION_BADGE_HEIGHT,
        left: badgeLeft,
        right: badgeLeft + badgeWidth,
        top: badgeTop,
      })
      return {
        ...overlay,
        badgeLeft,
        badgeTop,
        width: badgeWidth,
      }
    })
}

export function MarketPriceChart({
  defaultVisibleBars = 120,
  data,
  height = 420,
  hasMoreHistory = false,
  isLoadingMoreHistory = false,
  onCrosshairMove,
  onNeedOlderHistory,
  positionOverlays = [],
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
  positionOverlays?: Array<ChartPositionOverlay>
  resetSignal?: number
  viewportPresetKey?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const seriesColors = useMemo(() => {
    if (typeof document === 'undefined') {
      return { positive: '#1fd79a', negative: '#d4243a' }
    }
    const root = getComputedStyle(document.documentElement)
    return {
      positive: root.getPropertyValue('--color-positive').trim() || '#1fd79a',
      negative: root.getPropertyValue('--color-negative').trim() || '#d4243a',
    }
  }, [])
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
  const chartData = useMemo(() => sanitizeChartCandles(data), [data])
  const [projectedPositionOverlays, setProjectedPositionOverlays] = useState<
    Array<ProjectedPositionOverlay>
  >([])

  const histogramData = useMemo(
    () =>
      chartData.map<HistogramData<UTCTimestamp>>((candle) => ({
        color:
          candle.close >= candle.open
            ? `${seriesColors.positive}55`
            : `${seriesColors.negative}55`,
        time: candle.time as UTCTimestamp,
        value: candle.volume,
      })),
    [chartData, seriesColors.positive, seriesColors.negative],
  )
  const candleData = useMemo(
    () =>
      chartData.map<CandlestickData<UTCTimestamp>>((candle) => ({
        close: candle.close,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        time: candle.time as UTCTimestamp,
      })),
    [chartData],
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
  const updatePositionOverlayCoordinates = useEffectEvent(() => {
    if (
      !chartRef.current ||
      !candleSeriesRef.current ||
      !containerRef.current ||
      chartData.length === 0 ||
      positionOverlays.length === 0
    ) {
      setProjectedPositionOverlays([])
      return
    }

    const timeScale = chartRef.current.timeScale()
    const bounds = {
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
    }
    const projected = positionOverlays.flatMap<
      Omit<ProjectedPositionOverlay, 'badgeLeft' | 'badgeTop'>
    >((overlay) => {
      const startX = getInterpolatedTimeCoordinate({
        chartData,
        time: overlay.startTime,
        timeScale,
      })
      const endX = getInterpolatedTimeCoordinate({
        chartData,
        time: overlay.endTime,
        timeScale,
      })
      const y = candleSeriesRef.current?.priceToCoordinate(overlay.averagePrice)

      if (startX === null || endX === null || y === null) {
        return []
      }

      const lineEndX = endX <= startX ? startX + 8 : endX
      return [
        {
          ...overlay,
          endX: lineEndX,
          lineColor:
            overlay.side === 'buy'
              ? seriesColors.positive
              : seriesColors.negative,
          startX,
          width: 0,
          y,
        },
      ]
    })

    setProjectedPositionOverlays(
      stackPositionBadges({ bounds, overlays: projected }),
    )
  })
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
        data: chartData,
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
    if (!chartRef.current || chartData.length === 0) {
      return
    }

    const nextRange = buildDefaultLogicalRange(
      chartData.length,
      defaultVisibleBars,
    )

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
      borderDownColor: seriesColors.negative,
      borderUpColor: seriesColors.positive,
      downColor: seriesColors.negative,
      wickDownColor: seriesColors.negative,
      wickUpColor: seriesColors.positive,
      upColor: seriesColors.positive,
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
    const handleVisibleLogicalRangeChange = (range: LogicalRange | null) => {
      handleNeedOlderHistory(range)
      updatePositionOverlayCoordinates()
    }
    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange)
    chart.timeScale().subscribeSizeChange(updatePositionOverlayCoordinates)

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
      updatePositionOverlayCoordinates()
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
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange)
      chart.timeScale().unsubscribeSizeChange(updatePositionOverlayCoordinates)
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
      setProjectedPositionOverlays([])
    }
  }, [height, seriesColors])

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
    const nextFirstTime = chartData[0]?.time ?? null
    const nextLastTime = chartData[chartData.length - 1]?.time ?? null

    previousViewportPresetKeyRef.current = viewportPresetKey
    previousDataLengthRef.current = chartData.length
    previousFirstTimeRef.current = nextFirstTime
    previousLastTimeRef.current = nextLastTime

    if (chartData.length > 0) {
      if (hadNoData) {
        candleSeriesRef.current.setData(candleData)
        volumeSeriesRef.current.setData(histogramData)
        applyDefaultViewport()
        return
      }

      const nextRange = computePrependedLogicalRange({
        nextFirstTime,
        nextLastTime,
        nextLength: chartData.length,
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
        const startIndex = chartData.findIndex(
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
          updatePositionOverlayCoordinates()
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
      updatePositionOverlayCoordinates()
      return
    }

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(histogramData)
    previousFirstTimeRef.current = null
    previousLastTimeRef.current = null
    lastLogicalRangeRef.current = null
    handleCrosshairMove(null)
    updatePositionOverlayCoordinates()
  }, [
    candleData,
    chartData,
    chartData.length,
    histogramData,
    viewportPresetKey,
  ])

  useEffect(() => {
    if (resetSignal <= 0) return
    if (!chartRef.current) return
    hasUserInteractedRef.current = false
    applyDefaultViewport()
    updatePositionOverlayCoordinates()
  }, [resetSignal])

  useEffect(() => {
    hasUserInteractedRef.current = false
  }, [viewportPresetKey])

  useEffect(() => {
    updatePositionOverlayCoordinates()
  }, [chartData, positionOverlays])

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <div ref={containerRef} className="h-full min-h-[420px] w-full" />
      {projectedPositionOverlays.length > 0 ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg aria-hidden className="absolute inset-0 size-full">
            {projectedPositionOverlays.map((overlay) => (
              <line
                key={`${overlay.id}-line`}
                stroke={overlay.lineColor}
                strokeDasharray={
                  overlay.status === 'active' ? '5 4' : undefined
                }
                strokeLinecap="round"
                strokeWidth="2"
                x1={overlay.startX}
                x2={overlay.endX}
                y1={overlay.y}
                y2={overlay.y}
              />
            ))}
          </svg>
          {projectedPositionOverlays.map((overlay) => (
            <div
              className={`absolute flex h-6 items-center justify-center rounded-full border px-2 text-[11px] font-semibold shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm ${
                overlay.side === 'buy'
                  ? 'border-positive/60 bg-positive/90 text-background'
                  : 'border-negative/60 bg-negative/90 text-white'
              }`}
              key={`${overlay.id}-badge`}
              style={{
                left: overlay.badgeLeft,
                top: overlay.badgeTop,
                width: overlay.width,
              }}
            >
              <span className="truncate">{overlay.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {isLoadingMoreHistory ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Loading older history...
        </div>
      ) : null}
    </div>
  )
}
