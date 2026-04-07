import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.trading import Trade
from models.watchlist import Watchlist
from routers.market import fetch_quotes as fetch_market_quotes
from routers.trading import INITIAL_CASH, build_account_response, get_or_create_account
from schemas.dashboard import AccountSummary, DashboardResponse, WatchlistQuoteSnapshot
from schemas.market import StockQuote
from schemas.trading import TradeResponse

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def load_account_summary(db: AsyncSession) -> AccountSummary:
    try:
        account = await build_account_response(db)
        return AccountSummary(
            total_assets=account.total_assets,
            total_return_rate=account.total_return_rate,
        )
    except Exception:
        account = await get_or_create_account(db)
        total_assets = account.cash_balance
        return AccountSummary(
            total_assets=total_assets,
            total_return_rate=(total_assets - INITIAL_CASH) / INITIAL_CASH,
        )


async def load_recent_trades(db: AsyncSession) -> list[TradeResponse]:
    try:
        result = await db.execute(select(Trade).order_by(Trade.created_at.desc(), Trade.id.desc()).limit(5))
        trades = list(result.scalars().all())
        return [TradeResponse.model_validate(trade) for trade in trades]
    except Exception:
        return []


async def load_watchlist_quotes(db: AsyncSession) -> list[WatchlistQuoteSnapshot]:
    try:
        result = await db.execute(select(Watchlist).order_by(Watchlist.created_at.desc()).limit(5))
        watchlist_items = list(result.scalars().all())
        symbols = [item.symbol for item in watchlist_items]
        if not symbols:
            return []

        quotes = await asyncio.to_thread(fetch_market_quotes, symbols)
        quote_map = {quote.symbol: quote for quote in quotes}

        snapshots: list[WatchlistQuoteSnapshot] = []
        for symbol in symbols:
            quote = quote_map.get(symbol)
            if quote is None:
                continue
            snapshots.append(build_watchlist_snapshot(quote))

        return snapshots
    except Exception:
        return []


def build_watchlist_snapshot(quote: StockQuote) -> WatchlistQuoteSnapshot:
    return WatchlistQuoteSnapshot(
        symbol=quote.symbol,
        name=quote.name,
        price=quote.price,
        change_pct=quote.change_pct,
    )


@router.get("", response_model=DashboardResponse)
async def get_dashboard(db: DbSession) -> DashboardResponse:
    account_summary = await load_account_summary(db)
    recent_trades = await load_recent_trades(db)
    watchlist_quotes = await load_watchlist_quotes(db)

    return DashboardResponse(
        account_summary=account_summary,
        recent_trades=recent_trades,
        watchlist_quotes=watchlist_quotes,
    )
