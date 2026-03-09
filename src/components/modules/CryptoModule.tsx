'use client';

import type { CryptoConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import FinancialCard from './FinancialCard';
import { useFetchData } from '@/hooks/useFetchData';

interface CryptoModuleProps {
  config: CryptoConfig;
  style: ModuleStyle;
}

interface CryptoData {
  name: string;
  price: number;
  change24h: number;
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

/** Cards view — grid of financial cards */
function CardsView({ coins, scale }: { coins: CryptoData[]; scale: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center h-full gap-3 w-full">
      {coins.map((coin) => {
        const sign = coin.change24h >= 0 ? '+' : '';
        return (
          <FinancialCard
            key={coin.name}
            label={coin.name}
            price={coin.price}
            changeValue={coin.change24h}
            changeLabel={`${sign}${coin.change24h.toFixed(2)}%`}
            scale={scale}
          />
        );
      })}
    </div>
  );
}

/** Ticker view — horizontal scrolling marquee */
function TickerView({ coins, speed }: { coins: CryptoData[]; speed: number }) {
  const duration = Math.max(1, coins.length) * speed;

  const coinItems = coins.map((coin) => (
    <span key={coin.name} className="inline-flex items-center gap-2" style={{ fontSize: '0.875em' }}>
      <span className="font-semibold opacity-80">{coin.name}</span>
      <span className="font-bold">
        ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <ChangeColor value={coin.change24h}>
        {formatPercent(coin.change24h)}
      </ChangeColor>
    </span>
  ));

  return (
    <div className="flex items-center h-full w-full overflow-hidden">
      <div
        className="flex w-max animate-ticker-scroll whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex gap-6 pr-6 shrink-0">{coinItems}</div>
        <div className="flex gap-6 pr-6 shrink-0">{coinItems}</div>
      </div>
    </div>
  );
}

/** Table view — columnar layout */
function TableView({ coins, scale }: { coins: CryptoData[]; scale: number }) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <table
        className="border-collapse"
        style={{ fontSize: `${0.875 * scale}em` }}
      >
        <thead>
          <tr className="opacity-50 text-left" style={{ fontSize: `${0.8 * scale}em` }}>
            <th className="pr-4 pb-1 font-medium">Coin</th>
            <th className="pr-4 pb-1 font-medium text-right">Price</th>
            <th className="pb-1 font-medium text-right">24h %</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => (
            <tr key={coin.name}>
              <td className="pr-4 py-0.5 font-semibold opacity-80">{coin.name}</td>
              <td className="pr-4 py-0.5 text-right font-bold tabular-nums">
                ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-0.5 text-right tabular-nums">
                <ChangeColor value={coin.change24h}>{formatPercent(coin.change24h)}</ChangeColor>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Compact view — minimal single-line items */
function CompactView({ coins, scale }: { coins: CryptoData[]; scale: number }) {
  return (
    <div className="flex flex-col justify-center h-full w-full gap-1 px-2">
      {coins.map((coin) => (
        <div
          key={coin.name}
          className="flex items-center justify-between"
          style={{ fontSize: `${0.8 * scale}em` }}
        >
          <span className="font-semibold opacity-80 w-24">{coin.name}</span>
          <span className="font-bold tabular-nums">
            ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <ChangeColor value={coin.change24h}>
            <span className="tabular-nums w-20 text-right">{formatPercent(coin.change24h)}</span>
          </ChangeColor>
        </div>
      ))}
    </div>
  );
}

export default function CryptoModule({ config, style }: CryptoModuleProps) {
  const data = useFetchData<{ prices: CryptoData[] }>(
    `/api/crypto?ids=${encodeURIComponent(config.ids)}`,
    config.refreshIntervalMs ?? 60000,
  );
  const coins = data?.prices ?? [];
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

  if (coins.length === 0) {
    return (
      <ModuleWrapper style={style}>
        <p className="text-center opacity-50">No crypto data</p>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper style={style}>
      {view === 'cards' && <CardsView coins={coins} scale={scale} />}
      {view === 'ticker' && <TickerView coins={coins} speed={tickerSpeed} />}
      {view === 'table' && <TableView coins={coins} scale={scale} />}
      {view === 'compact' && <CompactView coins={coins} scale={scale} />}
    </ModuleWrapper>
  );
}
