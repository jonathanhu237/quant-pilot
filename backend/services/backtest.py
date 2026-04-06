from datetime import date

import akshare as ak
import numpy as np
import pandas as pd

from schemas.strategy import BacktestRequest, BacktestResult, StrategyMeta
from services.strategies.base import BaseStrategy
from services.strategies.dual_ma import DualMAStrategy
from services.strategies.rsi import RSIStrategy

STRATEGY_REGISTRY: dict[str, type[BaseStrategy]] = {
    DualMAStrategy.strategy_id: DualMAStrategy,
    RSIStrategy.strategy_id: RSIStrategy,
}


def list_strategy_metadata() -> list[StrategyMeta]:
    return [strategy_class.metadata() for strategy_class in STRATEGY_REGISTRY.values()]


def get_strategy_class(strategy_id: str) -> type[BaseStrategy]:
    strategy_class = STRATEGY_REGISTRY.get(strategy_id)
    if strategy_class is None:
        raise KeyError("Strategy not found")
    return strategy_class


def fetch_historical_data(symbol: str, start_date: date, end_date: date) -> pd.DataFrame:
    history = ak.stock_zh_a_hist(
        symbol=symbol,
        period="daily",
        start_date=start_date.strftime("%Y%m%d"),
        end_date=end_date.strftime("%Y%m%d"),
    )

    if history.empty:
        raise ValueError("No historical data available for the selected symbol and time range")

    prepared = history.rename(columns={"日期": "date", "收盘": "close"}).copy()
    prepared["date"] = pd.to_datetime(prepared["date"])
    prepared["close"] = pd.to_numeric(prepared["close"], errors="coerce")
    prepared = prepared.dropna(subset=["close"]).sort_values("date").reset_index(drop=True)

    if prepared.empty or len(prepared) < 2:
        raise ValueError("Not enough historical data to run a backtest")

    return prepared[["date", "close"]]


def calculate_metrics(close: pd.Series, signals: pd.Series) -> dict[str, float | int]:
    daily_returns = close.pct_change().fillna(0.0)
    strategy_returns: list[float] = [0.0]
    equity_curve: list[float] = [1.0]

    position = 0
    entry_price: float | None = None
    winning_trades = 0
    total_trades = 0

    for index in range(1, len(close)):
        daily_return = float(daily_returns.iloc[index]) * position
        strategy_returns.append(daily_return)
        equity_curve.append(equity_curve[-1] * (1 + daily_return))

        signal = int(signals.iloc[index])
        price = float(close.iloc[index])

        if signal == 1 and position == 0:
            position = 1
            entry_price = price
        elif signal == -1 and position == 1:
            if entry_price is not None:
                total_trades += 1
                if (price / entry_price) - 1 > 0:
                    winning_trades += 1
            position = 0
            entry_price = None

    if position == 1 and entry_price is not None:
        total_trades += 1
        if (float(close.iloc[-1]) / entry_price) - 1 > 0:
            winning_trades += 1

    equity = pd.Series(equity_curve)
    running_max = equity.cummax()
    drawdown = equity / running_max - 1

    daily_returns_series = pd.Series(strategy_returns)
    daily_std = float(daily_returns_series.std(ddof=0))
    sharpe_ratio = 0.0
    if daily_std > 0:
        sharpe_ratio = float(np.sqrt(252) * daily_returns_series.mean() / daily_std)

    periods = max(len(close) - 1, 1)
    annual_return = float(equity.iloc[-1] ** (252 / periods) - 1)
    max_drawdown = float(drawdown.min())
    win_rate = float(winning_trades / total_trades) if total_trades else 0.0

    return {
        "annual_return": annual_return,
        "max_drawdown": max_drawdown,
        "win_rate": win_rate,
        "sharpe_ratio": sharpe_ratio,
        "total_trades": total_trades,
    }


def run_backtest(request: BacktestRequest) -> BacktestResult:
    strategy_class = get_strategy_class(request.strategy_id)
    history = fetch_historical_data(request.symbol, request.start_date, request.end_date)
    strategy = strategy_class(request.params)
    signals = strategy.generate_signals(history).reindex(history.index).fillna(0).astype(int)
    metrics = calculate_metrics(history["close"], signals)

    return BacktestResult(
        strategy_id=request.strategy_id,
        symbol=request.symbol,
        annual_return=float(metrics["annual_return"]),
        max_drawdown=float(metrics["max_drawdown"]),
        win_rate=float(metrics["win_rate"]),
        sharpe_ratio=float(metrics["sharpe_ratio"]),
        total_trades=int(metrics["total_trades"]),
    )
