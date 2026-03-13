'use client';

import type { CryptoConfig, ModuleStyle } from '@/types/config';
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

function toFinancialItems(coins: CryptoData[]): FinancialItem[] {
  return coins.map((coin) => ({
    key: coin.name,
    label: coin.name,
    price: coin.price,
    changeValue: coin.change24h,
    changeLabel: formatPercent(coin.change24h),
  }));
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
        {formatUSD(coin.price)}
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
  const [data, error] = useFetchData<{ prices: CryptoData[] }>(
    cryptoUrl(config) ?? '',
    config.refreshIntervalMs ?? 60000,
  );
  const coins = data?.prices ?? [];
  const view = config.view ?? 'cards';
  const scale = config.cardScale ?? 1;
  const tickerSpeed = config.tickerSpeed ?? 5;

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading…" error={error} />;
  }

  if (coins.length === 0) {
    return <ModuleEmptyState style={style} message="No crypto data" />;
  }

  return (
    <ModuleWrapper style={style}>
      {view === 'cards' && <FinancialCardsView items={toFinancialItems(coins)} scale={scale} />}
      {view === 'ticker' && <FinancialTickerView items={toFinancialItems(coins)} speed={tickerSpeed} />}
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
            price: formatUSD(coin.price),
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
