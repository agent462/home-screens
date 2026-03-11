'use client';

import type { CryptoConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import FinancialCard from './FinancialCard';
import TickerMarquee from './TickerMarquee';
import { ModuleLoadingState, ModuleEmptyState } from './ModuleStates';
import { formatPercent, ChangeColor, FinancialTableView, FinancialCompactView } from './financial/shared';
import type { TableColumn } from './financial/shared';
import { useFetchData } from '@/hooks/useFetchData';
import { cryptoUrl } from '@/lib/fetch-keys';

interface CryptoModuleProps {
  config: CryptoConfig;
  style: ModuleStyle;
}

interface CryptoData {
  name: string;
  price: number;
  change24h: number;
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
  return (
    <TickerMarquee itemCount={coins.length} speed={speed}>
      {coins.map((coin) => (
        <span key={coin.name} className="inline-flex items-center gap-2" style={{ fontSize: '0.875em' }}>
          <span className="font-semibold opacity-80">{coin.name}</span>
          <span className="font-bold">
            ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <ChangeColor value={coin.change24h}>
            {formatPercent(coin.change24h)}
          </ChangeColor>
        </span>
      ))}
    </TickerMarquee>
  );
}

const cryptoTableColumns: TableColumn<CryptoData>[] = [
  {
    header: 'Coin',
    render: (coin) => <span className="font-semibold opacity-80">{coin.name}</span>,
  },
  {
    header: 'Price',
    align: 'right',
    render: (coin) => (
      <span className="font-bold">
        ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    header: '24h %',
    align: 'right',
    render: (coin) => (
      <ChangeColor value={coin.change24h}>{formatPercent(coin.change24h)}</ChangeColor>
    ),
  },
];

export default function CryptoModule({ config, style }: CryptoModuleProps) {
  const [data] = useFetchData<{ prices: CryptoData[] }>(
    cryptoUrl(config) ?? '',
    config.refreshIntervalMs ?? 60000,
  );
  const coins = data?.prices ?? [];
  const view = config.view ?? 'cards';
  const scale = config.cardScale ?? 1;
  const tickerSpeed = config.tickerSpeed ?? 5;

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading\u2026" />;
  }

  if (coins.length === 0) {
    return <ModuleEmptyState style={style} message="No crypto data" />;
  }

  return (
    <ModuleWrapper style={style}>
      {view === 'cards' && <CardsView coins={coins} scale={scale} />}
      {view === 'ticker' && <TickerView coins={coins} speed={tickerSpeed} />}
      {view === 'table' && (
        <FinancialTableView
          items={coins}
          columns={cryptoTableColumns}
          scale={scale}
          itemKey={(coin) => coin.name}
        />
      )}
      {view === 'compact' && (
        <FinancialCompactView
          rows={coins.map((coin) => ({
            key: coin.name,
            label: coin.name,
            price: `$${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: (
              <ChangeColor value={coin.change24h}>
                <span className="tabular-nums w-20 text-right">{formatPercent(coin.change24h)}</span>
              </ChangeColor>
            ),
          }))}
          scale={scale}
          labelWidth="w-24"
        />
      )}
    </ModuleWrapper>
  );
}
