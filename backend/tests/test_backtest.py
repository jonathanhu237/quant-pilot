from datetime import date

import pandas as pd
import pytest

from schemas.strategy import BacktestRequest
from services import backtest
from services.strategies.dual_ma import DualMAStrategy


def make_request(strategy_id: str = "dual_ma") -> BacktestRequest:
    return BacktestRequest(
        strategy_id=strategy_id,
        symbol="600519",
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 5),
        params={"short_window": 2, "long_window": 3},
    )


def test_run_backtest_succeeds_with_mocked_history(monkeypatch: pytest.MonkeyPatch) -> None:
    history = pd.DataFrame(
        {
            "date": pd.date_range("2024-01-01", periods=5, freq="D"),
            "close": [5.0, 4.0, 3.0, 4.0, 5.0],
        }
    )
    monkeypatch.setattr(backtest, "fetch_historical_data", lambda *_args: history)

    result = backtest.run_backtest(make_request())

    assert result.strategy_id == "dual_ma"
    assert result.symbol == "600519"
    assert isinstance(result.annual_return, float)
    assert result.total_trades >= 1
    assert len(result.equity_curve) == 5
    for point in result.equity_curve:
        assert point.date is not None
        assert isinstance(point.value, float)
    assert result.equity_curve[0].date == date(2024, 1, 1)
    assert isinstance(result.trades, list)
    for record in result.trades:
        assert record.entry_date is not None
        assert record.exit_date is not None
        assert isinstance(record.return_pct, float)


def test_run_backtest_equity_curve_dates_match_history(monkeypatch: pytest.MonkeyPatch) -> None:
    history_dates = [
        date(2024, 2, 1),
        date(2024, 2, 2),
        date(2024, 2, 5),
        date(2024, 2, 6),
    ]
    history = pd.DataFrame(
        {
            "date": pd.to_datetime(history_dates),
            "close": [10.0, 10.5, 11.0, 11.5],
        }
    )
    monkeypatch.setattr(backtest, "fetch_historical_data", lambda *_args: history)

    result = backtest.run_backtest(make_request())

    assert [point.date for point in result.equity_curve] == history_dates


def test_run_backtest_raises_for_unknown_strategy() -> None:
    with pytest.raises(ValueError, match="Strategy not found"):
        backtest.run_backtest(make_request(strategy_id="unknown"))


def test_run_backtest_raises_for_short_history(monkeypatch: pytest.MonkeyPatch) -> None:
    short_history = pd.DataFrame(
        {
            "date": pd.to_datetime(["2024-01-01"]),
            "close": [100.0],
        }
    )
    monkeypatch.setattr(backtest, "fetch_historical_data", lambda *_args: short_history)

    with pytest.raises(ValueError, match="Not enough historical data"):
        backtest.run_backtest(make_request())


def test_list_strategy_metadata_returns_registered_strategies() -> None:
    metadata = backtest.list_strategy_metadata()

    assert len(metadata) == 2
    assert {strategy.id for strategy in metadata} == {"dual_ma", "rsi"}
    assert all(strategy.parameters for strategy in metadata)


def test_get_strategy_class_returns_dual_ma_strategy() -> None:
    assert backtest.get_strategy_class("dual_ma") is DualMAStrategy


def test_get_strategy_class_raises_for_unknown_strategy() -> None:
    with pytest.raises(ValueError, match="Strategy not found"):
        backtest.get_strategy_class("nonexistent")


def test_calculate_metrics_returns_zero_values_for_no_signals() -> None:
    metrics = backtest.calculate_metrics(
        pd.Series([10.0, 10.0, 10.0]),
        pd.Series([0, 0, 0], dtype=int),
    )

    assert metrics["total_trades"] == 0
    assert metrics["annual_return"] == pytest.approx(0.0)
    assert metrics["win_rate"] == pytest.approx(0.0)
    equity_curve = metrics["equity_curve"]
    assert isinstance(equity_curve, list)
    assert len(equity_curve) == 3
    for value in equity_curve:
        assert value == pytest.approx(1.0)


def test_calculate_metrics_counts_winning_round_trip() -> None:
    metrics = backtest.calculate_metrics(
        pd.Series([10.0, 11.0, 12.0, 14.0]),
        pd.Series([0, 1, 0, -1], dtype=int),
    )

    assert metrics["total_trades"] == 1
    assert metrics["win_rate"] == pytest.approx(1.0)
    equity_curve = metrics["equity_curve"]
    assert isinstance(equity_curve, list)
    assert equity_curve[-1] > 1.0
    trades = metrics["trades"]
    assert isinstance(trades, list)
    assert len(trades) == 1
    trade = trades[0]
    assert trade["entry_index"] == 1
    assert trade["exit_index"] == 3
    assert trade["entry_price"] == pytest.approx(11.0)
    assert trade["exit_price"] == pytest.approx(14.0)
    assert trade["return_pct"] > 0.0


def test_calculate_metrics_counts_losing_round_trip() -> None:
    metrics = backtest.calculate_metrics(
        pd.Series([10.0, 12.0, 11.0, 9.0]),
        pd.Series([0, 1, 0, -1], dtype=int),
    )

    assert metrics["total_trades"] == 1
    assert metrics["win_rate"] == pytest.approx(0.0)


def test_calculate_metrics_counts_open_position_held_to_end() -> None:
    metrics = backtest.calculate_metrics(
        pd.Series([10.0, 11.0, 12.0, 13.0]),
        pd.Series([0, 1, 0, 0], dtype=int),
    )

    assert metrics["total_trades"] == 1
