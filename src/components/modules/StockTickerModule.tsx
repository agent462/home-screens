'use client';

import type { StockTickerConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { ModuleLoadingState, ModuleEmptyState } from './ModuleStates';
import {
  formatUSD,
  formatPercent,
  ChangeColor,
  FinancialCardsView,
  FinancialTickerView,
  FinancialTableView,
  FinancialCompactView,
} from './financial/shared';
import type { TableColumn, FinancialItem } from './financial/shared';
import { useFetchData } from '@/hooks/useFetchData';
import { stocksUrl } from '@/lib/fetch-keys';

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

function formatChange(val: number) {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}

function toFinancialItems(stocks: StockData[]): FinancialItem[] {
  return stocks.map((stock, i) => {
    const change = stock.change ?? 0;
    const changePercent = stock.changePercent ?? 0;
    return {
      key: `${stock.symbol}-${i}`,
      label: stock.symbol,
      price: stock.price ?? 0,
      changeValue: change,
      changeLabel: `${formatChange(change)} (${formatPercent(changePercent)})`,
    };
  });
}

const stockTableColumns: TableColumn<StockData>[] = [
  {
    header: 'Symbol',
    render: (stock) => <span className="font-semibold opacity-80">{stock.symbol}</span>,
  },
  {
    header: 'Price',
    align: 'right',
    render: (stock) => (
      <span className="font-bold">
        {formatUSD(stock.price ?? 0)}
      </span>
    ),
  },
  {
    header: 'Change',
    align: 'right',
    render: (stock) => {
      const change = stock.change ?? 0;
      return <ChangeColor value={change}>{formatChange(change)}</ChangeColor>;
    },
  },
  {
    header: '%',
    align: 'right',
    render: (stock) => {
      const changePercent = stock.changePercent ?? 0;
      return <ChangeColor value={changePercent}>{formatPercent(changePercent)}</ChangeColor>;
    },
  },
];

export default function StockTickerModule({ config, style }: StockTickerModuleProps) {
  const [data] = useFetchData<{ stocks: StockData[] }>(
    stocksUrl(config) ?? '',
    config.refreshIntervalMs ?? 60000,
  );
  const stocks = data?.stocks ?? [];
  const view = config.view ?? 'cards';
  const scale = config.cardScale ?? 1;
  const tickerSpeed = config.tickerSpeed ?? 5;

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading\u2026" />;
  }

  if (stocks.length === 0) {
    return <ModuleEmptyState style={style} message="No stock data" />;
  }

  return (
    <ModuleWrapper style={style}>
      {view === 'cards' && <FinancialCardsView items={toFinancialItems(stocks)} scale={scale} />}
      {view === 'ticker' && <FinancialTickerView items={toFinancialItems(stocks)} speed={tickerSpeed} />}
      {view === 'table' && (
        <FinancialTableView
          items={stocks}
          columns={stockTableColumns}
          scale={scale}
          itemKey={(stock, i) => `${stock.symbol}-${i}`}
        />
      )}
      {view === 'compact' && (
        <FinancialCompactView
          rows={stocks.map((stock, i) => {
            const changePercent = stock.changePercent ?? 0;
            return {
              key: `${stock.symbol}-${i}`,
              label: stock.symbol,
              price: formatUSD(stock.price ?? 0),
              change: (
                <ChangeColor value={changePercent}>
                  <span className="tabular-nums w-20 text-right">{formatPercent(changePercent)}</span>
                </ChangeColor>
              ),
            };
          })}
          scale={scale}
        />
      )}
    </ModuleWrapper>
  );
}
