import { Platform } from 'react-native';

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  change_amount: number;
};

export type StrategyParameterDefinition = {
  name: string;
  type: 'integer' | 'float';
  default: number;
  min: number | null;
  max: number | null;
  step: number | null;
};

export type StrategyMeta = {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameterDefinition[];
};

export type BacktestRequest = {
  strategy_id: string;
  symbol: string;
  start_date: string;
  end_date: string;
  params: Record<string, number>;
};

export type BacktestResult = {
  strategy_id: string;
  symbol: string;
  annual_return: number;
  max_drawdown: number;
  win_rate: number;
  sharpe_ratio: number;
  total_trades: number;
};

type WatchlistItem = {
  symbol: string;
};

type ErrorPayload = {
  detail?: string;
};

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = `http://${HOST}:8000`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as ErrorPayload;
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      const fallback = await response.text();
      if (fallback) {
        message = fallback;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getWatchlist(): Promise<string[]> {
  const items = await request<WatchlistItem[]>('/api/watchlist/');
  return items.map((item) => item.symbol);
}

export async function addToWatchlist(symbol: string): Promise<void> {
  await request<void>('/api/watchlist/', {
    method: 'POST',
    body: JSON.stringify({ symbol }),
  });
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  await request<void>(`/api/watchlist/${symbol}`, {
    method: 'DELETE',
  });
}

export async function getQuotes(symbols: string[]): Promise<StockQuote[]> {
  if (symbols.length === 0) {
    return [];
  }

  const query = encodeURIComponent(symbols.join(','));
  return request<StockQuote[]>(`/api/market/quotes?symbols=${query}`);
}

export async function getStrategies(): Promise<StrategyMeta[]> {
  return request<StrategyMeta[]>('/api/strategy/');
}

export async function runBacktest(payload: BacktestRequest): Promise<BacktestResult> {
  return request<BacktestResult>('/api/strategy/backtest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
