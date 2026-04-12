import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.watchlist import Watchlist
from schemas.market import StockQuote
from schemas.signal import StrategySignalSnapshot, SymbolSignalSnapshot
from services.backtest import STRATEGY_REGISTRY, fetch_historical_data
from services.quotes import fetch_quotes
from services.strategies.base import BaseStrategy

logger = logging.getLogger(__name__)

SIGNAL_MAP: dict[int, str] = {1: "buy", -1: "sell", 0: "hold"}
LOOKBACK_DAYS = 365


def _is_supported_symbol(symbol: str) -> bool:
    normalized = symbol.strip()
    return len(normalized) == 6 and normalized.isdigit()


def _map_signal(value: int) -> str:
    return SIGNAL_MAP.get(value, "hold")


def generate_signals_for_symbol(
    symbol: str,
    strategies: dict[str, type[BaseStrategy]],
) -> list[StrategySignalSnapshot]:
    end_date = date.today()
    start_date = end_date - timedelta(days=LOOKBACK_DAYS)
    historical_data = fetch_historical_data(symbol, start_date, end_date)

    if historical_data.empty:
        raise ValueError(f"No historical data available for symbol {symbol}")

    signal_date = historical_data["date"].iloc[-1].date().isoformat()
    snapshots: list[StrategySignalSnapshot] = []

    for strategy_id, strategy_class in strategies.items():
        try:
            strategy = strategy_class()
            signals = strategy.generate_signals(historical_data)
            normalized_signals = signals.reindex(historical_data.index).fillna(0).astype(int)
            signal_value = int(normalized_signals.iloc[-1])
            snapshots.append(
                StrategySignalSnapshot(
                    strategy_id=strategy_id,
                    strategy_name=strategy_class.name,
                    signal=_map_signal(signal_value),
                    signal_date=signal_date,
                )
            )
        except Exception:
            logger.warning(
                "Failed to generate signal for symbol %s with strategy %s",
                symbol,
                strategy_id,
                exc_info=True,
            )

    return snapshots


async def generate_watchlist_signals(db: AsyncSession) -> list[SymbolSignalSnapshot]:
    result = await db.execute(select(Watchlist).order_by(Watchlist.created_at.desc()))
    watchlist_items = list(result.scalars().all())
    symbols = [item.symbol.strip() for item in watchlist_items if _is_supported_symbol(item.symbol)]

    if not symbols:
        return []

    quotes = await asyncio.to_thread(fetch_quotes, symbols)
    quote_map: dict[str, StockQuote] = {quote.symbol: quote for quote in quotes}

    signal_tasks = [
        asyncio.to_thread(generate_signals_for_symbol, symbol, STRATEGY_REGISTRY)
        for symbol in symbols
    ]
    signal_results = await asyncio.gather(*signal_tasks, return_exceptions=True)

    snapshots: list[SymbolSignalSnapshot] = []
    for symbol, result in zip(symbols, signal_results, strict=False):
        if isinstance(result, Exception):
            logger.warning("Failed to generate signals for symbol %s: %s", symbol, result)
            continue

        quote = quote_map.get(symbol)
        if quote is None:
            logger.warning("Skipping symbol %s because quote data was unavailable", symbol)
            continue

        snapshots.append(
            SymbolSignalSnapshot(
                symbol=symbol,
                name=quote.name,
                price=quote.price,
                change_pct=quote.change_pct,
                signals=result,
            )
        )

    return snapshots
