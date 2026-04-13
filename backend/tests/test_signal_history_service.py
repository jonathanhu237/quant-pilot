from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from models.signal_history import SignalHistory
from models.watchlist import Watchlist
from schemas.signal import StrategySignalSnapshot
from services import signal_history


pytestmark = pytest.mark.asyncio


async def test_snapshot_writes_records(db_session) -> None:
    db_session.add_all([Watchlist(symbol="600519"), Watchlist(symbol="000001")])
    await db_session.commit()

    def fake_generate_signals_for_symbol(symbol: str, _strategies: dict[str, type]) -> list[StrategySignalSnapshot]:
        return [
            StrategySignalSnapshot(
                strategy_id="dual_ma",
                strategy_name="Dual Moving Average",
                signal="buy" if symbol == "600519" else "sell",
                signal_date="2024-01-05",
            )
        ]

    original = signal_history.generate_signals_for_symbol
    signal_history.generate_signals_for_symbol = fake_generate_signals_for_symbol
    try:
        inserted = await signal_history.snapshot_watchlist_signals(db_session)
    finally:
        signal_history.generate_signals_for_symbol = original

    assert inserted == 2

    result = await db_session.execute(select(SignalHistory).order_by(SignalHistory.symbol.asc()))
    rows = list(result.scalars().all())
    assert [(row.symbol, row.strategy_id, row.signal, row.signal_date.isoformat()) for row in rows] == [
        ("000001", "dual_ma", "sell", "2024-01-05"),
        ("600519", "dual_ma", "buy", "2024-01-05"),
    ]


async def test_snapshot_is_idempotent(db_session) -> None:
    db_session.add(Watchlist(symbol="600519"))
    await db_session.commit()

    def fake_generate_signals_for_symbol(_symbol: str, _strategies: dict[str, type]) -> list[StrategySignalSnapshot]:
        return [
            StrategySignalSnapshot(
                strategy_id="dual_ma",
                strategy_name="Dual Moving Average",
                signal="buy",
                signal_date="2024-01-05",
            )
        ]

    original = signal_history.generate_signals_for_symbol
    signal_history.generate_signals_for_symbol = fake_generate_signals_for_symbol
    try:
        first = await signal_history.snapshot_watchlist_signals(db_session)
        second = await signal_history.snapshot_watchlist_signals(db_session)
    finally:
        signal_history.generate_signals_for_symbol = original

    count_result = await db_session.execute(select(func.count()).select_from(SignalHistory))
    assert first == 1
    assert second == 0
    assert count_result.scalar_one() == 1


async def test_snapshot_skips_failing_symbol(db_session) -> None:
    db_session.add_all([Watchlist(symbol="600519"), Watchlist(symbol="000001")])
    await db_session.commit()

    def fake_generate_signals_for_symbol(symbol: str, _strategies: dict[str, type]) -> list[StrategySignalSnapshot]:
        if symbol == "600519":
            raise RuntimeError("boom")
        return [
            StrategySignalSnapshot(
                strategy_id="dual_ma",
                strategy_name="Dual Moving Average",
                signal="hold",
                signal_date="2024-01-05",
            )
        ]

    original = signal_history.generate_signals_for_symbol
    signal_history.generate_signals_for_symbol = fake_generate_signals_for_symbol
    try:
        inserted = await signal_history.snapshot_watchlist_signals(db_session)
    finally:
        signal_history.generate_signals_for_symbol = original

    assert inserted == 1
    result = await db_session.execute(select(SignalHistory))
    rows = list(result.scalars().all())
    assert len(rows) == 1
    assert rows[0].symbol == "000001"


async def test_get_signal_history_orders_by_date_desc(db_session) -> None:
    today = date.today()
    db_session.add_all(
        [
            SignalHistory(symbol="600519", strategy_id="dual_ma", signal="buy", signal_date=today - timedelta(days=3)),
            SignalHistory(symbol="600519", strategy_id="dual_ma", signal="sell", signal_date=today - timedelta(days=1)),
            SignalHistory(symbol="600519", strategy_id="rsi", signal="hold", signal_date=today - timedelta(days=2)),
        ]
    )
    await db_session.commit()

    result = await signal_history.get_signal_history(db_session, "600519", 30)

    assert [(item.signal_date, item.strategy_id) for item in result] == [
        ((today - timedelta(days=1)).isoformat(), "dual_ma"),
        ((today - timedelta(days=2)).isoformat(), "rsi"),
        ((today - timedelta(days=3)).isoformat(), "dual_ma"),
    ]


async def test_get_signal_history_filters_by_days(db_session) -> None:
    today = date.today()
    db_session.add_all(
        [
            SignalHistory(
                symbol="600519",
                strategy_id="dual_ma",
                signal="buy",
                signal_date=today - timedelta(days=10),
            ),
            SignalHistory(
                symbol="600519",
                strategy_id="dual_ma",
                signal="sell",
                signal_date=today - timedelta(days=40),
            ),
        ]
    )
    await db_session.commit()

    result = await signal_history.get_signal_history(db_session, "600519", 30)

    assert len(result) == 1
    assert result[0].signal_date == (today - timedelta(days=10)).isoformat()
