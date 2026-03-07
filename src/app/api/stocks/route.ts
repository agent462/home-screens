import { NextRequest, NextResponse } from 'next/server';

interface StockResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

async function fetchStock(symbol: string): Promise<StockResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${symbol}`);

  const data = await res.json();
  if (!data.chart?.result?.[0]?.meta) throw new Error(`No data for ${symbol}`);
  const meta = data.chart.result[0].meta;
  const price = meta.regularMarketPrice;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose;
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;

  return {
    symbol: symbol.toUpperCase(),
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || 'AAPL';
    const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

    const results = await Promise.allSettled(symbols.map(fetchStock));
    const stocks = results
      .filter((r): r is PromiseFulfilledResult<StockResult> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (stocks.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch any stock data' }, { status: 502 });
    }

    return NextResponse.json({ stocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stocks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
