'use client';
import { useState, useEffect, useCallback } from 'react';
import type { StockTickerConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface StockTickerModuleProps {
  config: StockTickerConfig;
  style: ModuleStyle;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function StockTickerModule({ config, style }: StockTickerModuleProps) {
  const [stocks, setStocks] = useState<StockData[]>([]);

  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch(`/api/stocks?symbols=${encodeURIComponent(config.symbols)}`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks ?? []);
      }
    } catch { }
  }, [config.symbols]);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, config.refreshIntervalMs ?? 60000);
    return () => clearInterval(interval);
  }, [fetchStocks, config.refreshIntervalMs]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-wrap items-center justify-center h-full gap-3 w-full">
        {stocks.length === 0 && <p className="text-center">Loading stocks...</p>}
        {stocks.map((stock) => {
          const positive = stock.change >= 0;
          const sign = positive ? '+' : '';
          const scale = config.cardScale ?? 1;
          return (
            <div
              key={stock.symbol}
              className="flex flex-col items-center rounded-lg"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                padding: `${0.75 * scale}rem ${1 * scale}rem`,
                gap: `${0.25 * scale}rem`,
              }}
            >
              <span className="font-semibold tracking-wider opacity-70" style={{ fontSize: `${0.75 * scale}rem` }}>{stock.symbol}</span>
              <span className="font-bold whitespace-nowrap" style={{ fontSize: `${1.25 * scale}rem` }}>${stock.price.toFixed(2)}</span>
              <span className={`whitespace-nowrap ${positive ? 'text-green-400' : 'text-red-400'}`} style={{ fontSize: `${0.75 * scale}rem` }}>
                {sign}{stock.change.toFixed(2)} ({sign}{stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          );
        })}
      </div>
    </ModuleWrapper>
  );
}
