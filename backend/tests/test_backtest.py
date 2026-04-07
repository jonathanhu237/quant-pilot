from datetime import date

import pandas as pd
import pytest

from schemas.strategy import BacktestRequest
from services import backtest


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

