'use client';
import { useState, useEffect, useCallback } from 'react';
import type { CryptoConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

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
  const [coins, setCoins] = useState<CryptoData[]>([]);

  const fetchCrypto = useCallback(async () => {
    try {
      const res = await fetch(`/api/crypto?ids=${encodeURIComponent(config.ids)}`);
      if (res.ok) {
        const data = await res.json();
        setCoins(data.prices ?? []);
      }
    } catch { }
  }, [config.ids]);

  useEffect(() => {
    fetchCrypto();
    const interval = setInterval(fetchCrypto, config.refreshIntervalMs ?? 60000);
    return () => clearInterval(interval);
  }, [fetchCrypto, config.refreshIntervalMs]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-wrap items-center justify-center h-full gap-3 w-full">
        {coins.length === 0 && <p className="text-center">Loading crypto...</p>}
        {coins.map((coin) => {
          const positive = coin.change24h >= 0;
          const sign = positive ? '+' : '';
          const scale = config.cardScale ?? 1;
          return (
            <div
              key={coin.name}
              className="flex flex-col items-center rounded-lg"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                padding: `${0.75 * scale}rem ${1 * scale}rem`,
                gap: `${0.25 * scale}rem`,
              }}
            >
              <span className="font-semibold tracking-wider opacity-70" style={{ fontSize: `${0.75 * scale}rem` }}>{coin.name}</span>
              <span className="font-bold whitespace-nowrap" style={{ fontSize: `${1.25 * scale}rem` }}>${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`whitespace-nowrap ${positive ? 'text-green-400' : 'text-red-400'}`} style={{ fontSize: `${0.75 * scale}rem` }}>
                {sign}{coin.change24h.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </ModuleWrapper>
  );
}
