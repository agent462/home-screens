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

export default function CryptoModule({ config, style }: CryptoModuleProps) {
  const data = useFetchData<{ prices: CryptoData[] }>(
    `/api/crypto?ids=${encodeURIComponent(config.ids)}`,
    config.refreshIntervalMs ?? 60000,
  );
  const coins = data?.prices ?? [];
  const scale = config.cardScale ?? 1;

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-wrap items-center justify-center h-full gap-3 w-full">
        {coins.length === 0 && <p className="text-center">Loading crypto...</p>}
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
    </ModuleWrapper>
  );
}
