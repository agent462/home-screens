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

function formatChange(val: number) {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}

function formatPercent(val: number) {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function ChangeColor({ value, children }: { value: number; children: React.ReactNode }) {
  return (
    <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
      {children}
    </span>
  );
}

/** Cards view — existing grid of cards */
function CardsView({ stocks, scale }: { stocks: StockData[]; scale: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center h-full gap-3 w-full">
      {stocks.map((stock, i) => {
        const change = stock.change ?? 0;
        const changePercent = stock.changePercent ?? 0;
        return (
          <FinancialCard
            key={`${stock.symbol}-${i}`}
            label={stock.symbol}
            price={stock.price ?? 0}
            changeValue={change}
            changeLabel={`${formatChange(change)} (${formatPercent(changePercent)})`}
            scale={scale}
          />
        );
      })}
    </div>
  );
}

/** Ticker view — horizontal scrolling marquee */
function TickerView({ stocks, speed }: { stocks: StockData[]; speed: number }) {
  const duration = Math.max(1, stocks.length) * speed;

  const stockItems = stocks.map((stock, i) => {
    const change = stock.change ?? 0;
    const changePercent = stock.changePercent ?? 0;
    return (
      <span key={`${stock.symbol}-${i}`} className="inline-flex items-center gap-2" style={{ fontSize: '0.875em' }}>
        <span className="font-semibold opacity-80">{stock.symbol}</span>
        <span className="font-bold">
          ${(stock.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <ChangeColor value={change}>
          {formatChange(change)} ({formatPercent(changePercent)})
        </ChangeColor>
      </span>
    );
  });

  return (
    <div className="flex items-center h-full w-full overflow-hidden">
      <div
        className="flex w-max animate-ticker-scroll whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex gap-6 pr-6 shrink-0">{stockItems}</div>
        <div className="flex gap-6 pr-6 shrink-0">{stockItems}</div>
      </div>
    </div>
  );
}

/** Table view — columnar layout */
function TableView({ stocks, scale }: { stocks: StockData[]; scale: number }) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <table
        className="border-collapse"
        style={{ fontSize: `${0.875 * scale}em` }}
      >
        <thead>
          <tr className="opacity-50 text-left" style={{ fontSize: `${0.8 * scale}em` }}>
            <th className="pr-4 pb-1 font-medium">Symbol</th>
            <th className="pr-4 pb-1 font-medium text-right">Price</th>
            <th className="pr-4 pb-1 font-medium text-right">Change</th>
            <th className="pb-1 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock, i) => {
            const change = stock.change ?? 0;
            const changePercent = stock.changePercent ?? 0;
            return (
              <tr key={`${stock.symbol}-${i}`}>
                <td className="pr-4 py-0.5 font-semibold opacity-80">{stock.symbol}</td>
                <td className="pr-4 py-0.5 text-right font-bold tabular-nums">
                  ${(stock.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="pr-4 py-0.5 text-right tabular-nums">
                  <ChangeColor value={change}>{formatChange(change)}</ChangeColor>
                </td>
                <td className="py-0.5 text-right tabular-nums">
                  <ChangeColor value={changePercent}>{formatPercent(changePercent)}</ChangeColor>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Compact view — minimal single-line items */
function CompactView({ stocks, scale }: { stocks: StockData[]; scale: number }) {
  return (
    <div className="flex flex-col justify-center h-full w-full gap-1 px-2">
      {stocks.map((stock, i) => {
        const change = stock.change ?? 0;
        const changePercent = stock.changePercent ?? 0;
        return (
          <div
            key={`${stock.symbol}-${i}`}
            className="flex items-center justify-between"
            style={{ fontSize: `${0.8 * scale}em` }}
          >
            <span className="font-semibold opacity-80 w-20">{stock.symbol}</span>
            <span className="font-bold tabular-nums">
              ${(stock.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <ChangeColor value={changePercent}>
              <span className="tabular-nums w-20 text-right">{formatPercent(changePercent)}</span>
            </ChangeColor>
          </div>
        );
      })}
    </div>
  );
}

export default function StockTickerModule({ config, style }: StockTickerModuleProps) {
  const data = useFetchData<{ stocks: StockData[] }>(
    `/api/stocks?symbols=${encodeURIComponent(config.symbols)}`,
    config.refreshIntervalMs ?? 60000,
  );
  const stocks = data?.stocks ?? [];
  const view = config.view ?? 'cards';
  const scale = config.cardScale ?? 1;
  const tickerSpeed = config.tickerSpeed ?? 5;

  if (data === null) {
    return (
      <ModuleWrapper style={style}>
        <p className="text-center opacity-50">Loading…</p>
      </ModuleWrapper>
    );
  }

  if (stocks.length === 0) {
    return (
      <ModuleWrapper style={style}>
        <p className="text-center opacity-50">No stock data</p>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper style={style}>
      {view === 'cards' && <CardsView stocks={stocks} scale={scale} />}
      {view === 'ticker' && <TickerView stocks={stocks} speed={tickerSpeed} />}
      {view === 'table' && <TableView stocks={stocks} scale={scale} />}
      {view === 'compact' && <CompactView stocks={stocks} scale={scale} />}
    </ModuleWrapper>
  );
}
