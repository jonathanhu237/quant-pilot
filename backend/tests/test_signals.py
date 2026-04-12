from datetime import date

import pandas as pd
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.watchlist import Watchlist
from schemas.market import StockQuote
from schemas.signal import StrategySignalSnapshot
from services import signals
from services.strategies.base import BaseStrategy
from services.strategies.dual_ma import DualMAStrategy


def make_history_frame(values: list[float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "date": pd.date_range("2024-01-01", periods=len(values), freq="D"),
            "close": values,
        }
    )


class HoldStrategy(BaseStrategy):
    strategy_id = "hold"
    name = "Hold Strategy"
    description = "Always holds."
    parameters: list = []

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        return pd.Series(0, index=data.index, dtype=int)


class BuyStrategy(BaseStrategy):
    strategy_id = "buy"
    name = "Buy Strategy"
    description = "Always buys on the final bar."
    parameters: list = []

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        signals = pd.Series(0, index=data.index, dtype=int)
        signals.iloc[-1] = 1
        return signals


class FailingStrategy(BaseStrategy):
    strategy_id = "fail"
    name = "Failing Strategy"
    description = "Raises on purpose."
    parameters: list = []

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        raise RuntimeError("boom")


pytestmark = pytest.mark.asyncio


async def test_generate_signals_for_symbol_returns_all_strategies(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(signals, "fetch_historical_data", lambda *_args: make_history_frame([10, 11, 12, 13]))
    monkeypatch.setattr(
        signals,
        "STRATEGY_REGISTRY",
        {
            HoldStrategy.strategy_id: HoldStrategy,
            BuyStrategy.strategy_id: BuyStrategy,
        },
    )

    snapshots = signals.generate_signals_for_symbol("600519", signals.STRATEGY_REGISTRY)

    assert len(snapshots) == 2
    assert {snapshot.strategy_id for snapshot in snapshots} == {"hold", "buy"}
    assert all(snapshot.signal_date == "2024-01-04" for snapshot in snapshots)


async def test_generate_signals_for_symbol_maps_buy_signal(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(signals, "fetch_historical_data", lambda *_args: make_history_frame([5, 4, 3, 4, 5]))
    monkeypatch.setattr(
        DualMAStrategy,
        "parameters",
        [
            DualMAStrategy.parameters[0].model_copy(update={"default": 2}),
            DualMAStrategy.parameters[1].model_copy(update={"default": 3}),
        ],
    )

    snapshots = signals.generate_signals_for_symbol(
        "600519",
        {DualMAStrategy.strategy_id: DualMAStrategy},
    )

    assert snapshots == [
        StrategySignalSnapshot(
            strategy_id="dual_ma",
            strategy_name="Dual Moving Average",
            signal="buy",
            signal_date="2024-01-05",
        )
    ]


async def test_generate_signals_for_symbol_skips_failing_strategy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(signals, "fetch_historical_data", lambda *_args: make_history_frame([10, 11, 12]))
    monkeypatch.setattr(
        signals,
        "STRATEGY_REGISTRY",
        {
            BuyStrategy.strategy_id: BuyStrategy,
            FailingStrategy.strategy_id: FailingStrategy,
        },
    )

    snapshots = signals.generate_signals_for_symbol("600519", signals.STRATEGY_REGISTRY)

    assert len(snapshots) == 1
    assert snapshots[0].strategy_id == "buy"
    assert snapshots[0].signal == "buy"


async def test_generate_watchlist_signals_returns_empty_for_no_watchlist(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    def fake_fetch_quotes(_: list[str]) -> list[StockQuote]:
        nonlocal called
        called = True
        return []

    monkeypatch.setattr(signals, "fetch_quotes", fake_fetch_quotes)

    result = await signals.generate_watchlist_signals(db_session)

    assert result == []
    assert called is False


async def test_generate_watchlist_signals_returns_signals(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db_session.add(Watchlist(symbol="600519"))
    await db_session.commit()

    monkeypatch.setattr(
        signals,
        "fetch_quotes",
        lambda _symbols: [
            StockQuote(symbol="600519", name="Kweichow Moutai", price=1830.0, change_pct=1.25, change_amount=22.5)
        ],
    )
    monkeypatch.setattr(
        signals,
        "generate_signals_for_symbol",
        lambda symbol, _registry: [
            StrategySignalSnapshot(
                strategy_id="buy",
                strategy_name="Buy Strategy",
                signal="buy",
                signal_date="2024-01-05",
            )
        ]
        if symbol == "600519"
        else [],
    )

    result = await signals.generate_watchlist_signals(db_session)

    assert result == [
        signals.SymbolSignalSnapshot(
            symbol="600519",
            name="Kweichow Moutai",
            price=1830.0,
            change_pct=1.25,
            signals=[
                StrategySignalSnapshot(
                    strategy_id="buy",
                    strategy_name="Buy Strategy",
                    signal="buy",
                    signal_date="2024-01-05",
                )
            ],
        )
    ]


async def test_generate_watchlist_signals_skips_failing_symbol(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db_session.add_all([Watchlist(symbol="600519"), Watchlist(symbol="000001")])
    await db_session.commit()

    monkeypatch.setattr(
        signals,
        "fetch_quotes",
        lambda _symbols: [
            StockQuote(symbol="600519", name="Kweichow Moutai", price=1830.0, change_pct=1.25, change_amount=22.5),
            StockQuote(symbol="000001", name="Ping An Bank", price=12.34, change_pct=-0.52, change_amount=-0.06),
        ],
    )

    def fake_generate(symbol: str, _registry: dict[str, type[BaseStrategy]]) -> list[StrategySignalSnapshot]:
        if symbol == "600519":
            raise RuntimeError("boom")
        return [
            StrategySignalSnapshot(
                strategy_id="buy",
                strategy_name="Buy Strategy",
                signal="buy",
                signal_date="2024-01-05",
            )
        ]

    monkeypatch.setattr(signals, "generate_signals_for_symbol", fake_generate)

    result = await signals.generate_watchlist_signals(db_session)

    assert [item.symbol for item in result] == ["000001"]
