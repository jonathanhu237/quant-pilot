import asyncio
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.signal_history import SignalHistory
from models.watchlist import Watchlist
from schemas.signal_history import SignalHistoryEntry
from services.signals import STRATEGY_REGISTRY, generate_signals_for_symbol

logger = logging.getLogger(__name__)
SHANGHAI_TIMEZONE = ZoneInfo("Asia/Shanghai")


def _is_supported_symbol(symbol: str) -> bool:
    normalized = symbol.strip()
    return len(normalized) == 6 and normalized.isdigit()


async def snapshot_watchlist_signals(db: AsyncSession) -> int:
    result = await db.execute(select(Watchlist).order_by(Watchlist.created_at.desc()))
    watchlist_items = list(result.scalars().all())
    symbols = [item.symbol.strip() for item in watchlist_items]

    inserted = 0
    tasks = []
    task_symbols: list[str] = []
    for symbol in symbols:
        if not _is_supported_symbol(symbol):
            logger.warning("Skipping unsupported symbol %s while snapshotting signals", symbol)
            continue
        task_symbols.append(symbol)
        tasks.append(asyncio.to_thread(generate_signals_for_symbol, symbol, STRATEGY_REGISTRY))

    if not tasks:
        return 0

    results = await asyncio.gather(*tasks, return_exceptions=True)
    for symbol, result in zip(task_symbols, results, strict=False):
        if isinstance(result, Exception):
            logger.warning("Failed to snapshot signals for symbol %s: %s", symbol, result)
            continue

        for snapshot in result:
            signal_date = date.fromisoformat(snapshot.signal_date)
            try:
                async with db.begin_nested():
                    db.add(
                        SignalHistory(
                            symbol=symbol,
                            strategy_id=snapshot.strategy_id,
                            signal=snapshot.signal,
                            signal_date=signal_date,
                        )
                    )
                    await db.flush()
            except IntegrityError:
                logger.debug(
                    "Skipping duplicate signal history snapshot for %s %s %s",
                    symbol,
                    snapshot.strategy_id,
                    signal_date.isoformat(),
                )
                continue
            inserted += 1

    await db.commit()

    return inserted


async def get_signal_history(db: AsyncSession, symbol: str, days: int) -> list[SignalHistoryEntry]:
    cutoff = datetime.now(SHANGHAI_TIMEZONE).date() - timedelta(days=days - 1)
    result = await db.execute(
        select(SignalHistory)
        .where(
            SignalHistory.symbol == symbol,
            SignalHistory.signal_date >= cutoff,
        )
        .order_by(SignalHistory.signal_date.desc(), SignalHistory.strategy_id.asc())
    )
    records = list(result.scalars().all())
    strategy_names = {
        strategy_id: strategy_class.name
        for strategy_id, strategy_class in STRATEGY_REGISTRY.items()
    }
    return [
        SignalHistoryEntry(
            symbol=record.symbol,
            strategy_id=record.strategy_id,
            strategy_name=strategy_names.get(record.strategy_id, record.strategy_id),
            signal=record.signal,
            signal_date=record.signal_date.isoformat(),
        )
        for record in records
    ]
