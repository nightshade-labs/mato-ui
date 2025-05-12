'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  UTCTimestamp, 
  IChartApi, 
  SeriesType,
  ISeriesApi,
  SeriesOptionsMap,
  LineData,
  LineSeries
} from 'lightweight-charts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMarketData, MarketDataPoint, MarketDataPage } from '../actions/fetch-market-data';

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch market data with infinite scrolling
  const { data: marketData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['marketData'],
    queryFn: ({ pageParam }) => fetchMarketData(pageParam as number | undefined),
    getNextPageParam: (lastPage: MarketDataPage) => lastPage.oldestTimestamp,
    initialPageParam: undefined as number | undefined,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#DDD',
      },
      grid: {
        vertLines: { color: '#444' },
        horzLines: { color: '#444' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#00ff00',
      lineWidth: 2,
    });

    chartRef.current = chart;
    lineSeriesRef.current = lineSeries;

    // Handle time scale scrolling
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      if (logicalRange !== null && lineSeriesRef.current) {
        const barsInfo = lineSeriesRef.current.barsInLogicalRange(logicalRange);
        if (
          barsInfo !== null &&
          barsInfo.barsBefore < 50 && // Load more when less than 50 bars before visible range
          !isFetchingNextPage &&
          hasNextPage
        ) {
          fetchNextPage();
        }
      }
    });

    setIsInitialized(true);

    return () => {
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!isInitialized || !lineSeriesRef.current || !marketData) return;

    // Combine all pages of data
    const allData = marketData.pages.flatMap(page => page.data);
    
    // Sort by time to ensure correct order
    const sortedData = allData.sort((a, b) => a.time - b.time);
    
    // Remove duplicates based on timestamp
    const uniqueData = sortedData.filter((point, index, self) =>
      index === self.findIndex((p) => p.time === point.time)
    );

    lineSeriesRef.current.setData(uniqueData);

    // Ensure we're showing the latest data
    if (uniqueData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [marketData, isInitialized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={chartContainerRef} />;
} 