'use client';

import type { StockTickerConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import FinancialCard from './FinancialCard';
import { useFetchData } from '@/hooks/useFetchData';

interface StockTickerModuleProps {
  config: StockTickerConfig;
  style: ModuleStyle;
}

interface StockData {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export default function StockTickerModule({ config, style }: StockTickerModuleProps) {
  const data = useFetchData<{ stocks: StockData[] }>(
    `/api/stocks?symbols=${encodeURIComponent(config.symbols)}`,
    config.refreshIntervalMs ?? 60000,
  );
  const stocks = data?.stocks ?? [];
  const scale = config.cardScale ?? 1;

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-wrap items-center justify-center h-full gap-3 w-full">
        {stocks.length === 0 && <p className="text-center">Loading stocks...</p>}
        {stocks.map((stock) => {
          const change = stock.change ?? 0;
          const changePercent = stock.changePercent ?? 0;
          const sign = change >= 0 ? '+' : '';
          return (
            <FinancialCard
              key={stock.symbol}
              label={stock.symbol}
              price={stock.price ?? 0}
              changeValue={change}
              changeLabel={`${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`}
              scale={scale}
            />
          );
        })}
      </div>
    </ModuleWrapper>
  );
}
