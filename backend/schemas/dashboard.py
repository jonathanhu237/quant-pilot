from pydantic import BaseModel

from .trading import TradeResponse


class AccountSummary(BaseModel):
    total_assets: float
    total_return_rate: float


class WatchlistQuoteSnapshot(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float


class DashboardResponse(BaseModel):
    account_summary: AccountSummary
    recent_trades: list[TradeResponse]
    watchlist_quotes: list[WatchlistQuoteSnapshot]
