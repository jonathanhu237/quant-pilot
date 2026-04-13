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

export type TradingPosition = {
  symbol: string;
  name: string;
  shares: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
};

export type TradingAccount = {
  cash_balance: number;
  market_value: number;
  total_assets: number;
  total_pnl: number;
  total_return_rate: number;
  positions: TradingPosition[];
};

export type TradingTrade = {
  id: number;
  side: 'buy' | 'sell';
  symbol: string;
  shares: number;
  price: number;
  created_at: string;
};

export type TradeRequest = {
  symbol: string;
  shares: number;
};

export type DashboardAccountSummary = {
  total_assets: number;
  total_return_rate: number;
};

export type DashboardTrade = {
  id: number;
  side: 'buy' | 'sell';
  symbol: string;
  shares: number;
  price: number;
  created_at: string;
};

export type DashboardWatchlistQuote = {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
};

export type DashboardResponse = {
  account_summary: DashboardAccountSummary;
  recent_trades: DashboardTrade[];
  watchlist_quotes: DashboardWatchlistQuote[];
};

export type StrategySignalSnapshot = {
  strategy_id: string;
  strategy_name: string;
  signal: 'buy' | 'sell' | 'hold';
  signal_date: string;
};

export type SymbolSignalSnapshot = {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  signals: StrategySignalSnapshot[];
};

export type SignalHistoryEntry = {
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  signal_date: string;
  strategy_id: string;
  strategy_name: string;
};

type WatchlistItem = {
  symbol: string;
};

type StructuredErrorDetail = {
  error_code?: string;
  message?: string;
};

type ErrorPayload = {
  detail?: string | StructuredErrorDetail;
};

type RequestError = Error & {
  code?: string;
};

const HOST = process.env.EXPO_OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = `http://${HOST}:8000`;

function isStructuredErrorDetail(value: unknown): value is StructuredErrorDetail {
  return typeof value === 'object' && value !== null;
}

function buildRequestError(message: string, code?: string): RequestError {
  const error = new Error(message) as RequestError;
  if (code) {
    error.code = code;
  }
  return error;
}

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
    let code: string | undefined;

    try {
      const payload = (await response.json()) as ErrorPayload;
      if (payload.detail) {
        if (typeof payload.detail === 'string') {
          message = payload.detail;
        } else if (isStructuredErrorDetail(payload.detail)) {
          code = payload.detail.error_code;
          message = payload.detail.message ?? message;
        }
      }
    } catch {
      const fallback = await response.text();
      if (fallback) {
        message = fallback;
      }
    }

    throw buildRequestError(message, code);
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

export async function getTradingAccount(): Promise<TradingAccount> {
  return request<TradingAccount>('/api/trading/account');
}

export async function buyStock(payload: TradeRequest): Promise<void> {
  await request('/api/trading/buy', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sellStock(payload: TradeRequest): Promise<void> {
  await request('/api/trading/sell', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTradeHistory(): Promise<TradingTrade[]> {
  return request<TradingTrade[]>('/api/trading/history');
}

export async function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>('/api/dashboard');
}

export async function getWatchlistSignals(): Promise<SymbolSignalSnapshot[]> {
  return request<SymbolSignalSnapshot[]>('/api/signals/watchlist');
}

export async function getSignalHistory(symbol: string, days?: number): Promise<SignalHistoryEntry[]> {
  const query = new URLSearchParams();

  if (typeof days === 'number') {
    query.set('days', String(days));
  }

  const queryString = query.toString();
  return request<SignalHistoryEntry[]>(
    `/api/signals/history/${encodeURIComponent(symbol)}${queryString ? `?${queryString}` : ''}`
  );
}
