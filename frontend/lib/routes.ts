export const MARKET_ADD_SYMBOL_ROUTE = '/(tabs)/market/add-symbol' as const;
export const MARKET_DETAIL_ROUTE_PATTERN = '/(tabs)/market/[symbol]' as const;
export const PAPER_TRADING_NEW_TRADE_ROUTE = '/(tabs)/paper-trading/new-trade' as const;
export const HOME_SIGNAL_HISTORY_ROUTE = '/(tabs)/(home)/signal-history' as const;
export const HOME_NEW_TRADE_ROUTE = '/(tabs)/(home)/new-trade' as const;

export function getMarketDetailRoute(symbol: string) {
  return {
    params: { symbol },
    pathname: MARKET_DETAIL_ROUTE_PATTERN,
  } as const;
}
