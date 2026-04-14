from datetime import date

import numpy as np
import pandas as pd

from schemas.strategy import (
    BacktestRequest,
    BacktestResult,
    EquityPoint,
    StrategyMeta,
    TradeRecord,
)
from services.strategies.base import BaseStrategy
from services.strategies.dual_ma import DualMAStrategy
from services.strategies.rsi import RSIStrategy
from services.tencent_kline import fetch_kline_page as _fetch_kline_page

STRATEGY_REGISTRY: dict[str, type[BaseStrategy]] = {
    DualMAStrategy.strategy_id: DualMAStrategy,
    RSIStrategy.strategy_id: RSIStrategy,
}


def list_strategy_metadata() -> list[StrategyMeta]:
    return [strategy_class.metadata() for strategy_class in STRATEGY_REGISTRY.values()]


def get_strategy_class(strategy_id: str) -> type[BaseStrategy]:
    strategy_class = STRATEGY_REGISTRY.get(strategy_id)
    if strategy_class is None:
        raise ValueError("Strategy not found")
    return strategy_class
def fetch_historical_data(symbol: str, start_date: date, end_date: date) -> pd.DataFrame:
    from datetime import timedelta

    market = "sh" if symbol.startswith(("6", "9")) else "sz"
    full_symbol = f"{market}{symbol}"

    # Paginate backwards: each page ≤ 640 rows; 5y ≈ 1250 rows → 2 pages max
    all_rows: list[list[str]] = []
    current_end = end_date
    seen: set[str] = set()

    while True:
        page = _fetch_kline_page(full_symbol, start_date, current_end)
        if not page:
            break
        for row in page:
            if row[0] not in seen:
                seen.add(row[0])
                all_rows.append(row)
        # If earliest row in this page is at or before start_date, we're done
        if page[0][0] <= start_date.strftime("%Y-%m-%d"):
            break
        current_end = date.fromisoformat(page[0][0]) - timedelta(days=1)

    if not all_rows:
        raise ValueError("No historical data available for the selected symbol and time range")

    df = pd.DataFrame(all_rows, columns=["date", "open", "close", "high", "low", "volume"])
    df["date"] = pd.to_datetime(df["date"])
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna(subset=["close"]).sort_values("date").reset_index(drop=True)

    if len(df) < 2:
        raise ValueError("Not enough historical data to run a backtest")

    return df[["date", "close"]]


def calculate_metrics(close: pd.Series, signals: pd.Series) -> dict[str, object]:
    daily_returns = close.pct_change().fillna(0.0)
    strategy_returns: list[float] = [0.0]
    equity_curve: list[float] = [1.0]

    position = 0
    entry_price: float | None = None
    entry_index: int | None = None
    winning_trades = 0
    total_trades = 0
    trades: list[dict[str, object]] = []

    for index in range(1, len(close)):
        daily_return = float(daily_returns.iloc[index]) * position
        strategy_returns.append(daily_return)
        equity_curve.append(equity_curve[-1] * (1 + daily_return))

        signal = int(signals.iloc[index])
        price = float(close.iloc[index])

        if signal == 1 and position == 0:
            position = 1
            entry_price = price
            entry_index = index
        elif signal == -1 and position == 1:
            if entry_price is not None and entry_index is not None:
                total_trades += 1
                return_pct = (price / entry_price) - 1
                if return_pct > 0:
                    winning_trades += 1
                trades.append(
                    {
                        "entry_index": entry_index,
                        "exit_index": index,
                        "entry_price": entry_price,
                        "exit_price": price,
                        "return_pct": float(return_pct),
                    }
                )
            position = 0
            entry_price = None
            entry_index = None

    if position == 1 and entry_price is not None and entry_index is not None:
        total_trades += 1
        last_index = len(close) - 1
        last_price = float(close.iloc[-1])
        return_pct = (last_price / entry_price) - 1
        if return_pct > 0:
            winning_trades += 1
        trades.append(
            {
                "entry_index": entry_index,
                "exit_index": last_index,
                "entry_price": entry_price,
                "exit_price": last_price,
                "return_pct": float(return_pct),
            }
        )

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
        "equity_curve": [float(value) for value in equity_curve],
        "trades": trades,
    }


def run_backtest(request: BacktestRequest) -> BacktestResult:
    strategy_class = get_strategy_class(request.strategy_id)
    history = fetch_historical_data(request.symbol, request.start_date, request.end_date)
    if len(history) < 2:
        raise ValueError("Not enough historical data to run a backtest")
    strategy = strategy_class(request.params)
    signals = strategy.generate_signals(history).reindex(history.index).fillna(0).astype(int)
    metrics = calculate_metrics(history["close"], signals)

    equity_values = metrics["equity_curve"]
    assert isinstance(equity_values, list)
    equity_points = [
        EquityPoint(date=history["date"].iloc[index].date(), value=float(value))
        for index, value in enumerate(equity_values)
    ]

    raw_trades = metrics["trades"]
    assert isinstance(raw_trades, list)
    trade_records = [
        TradeRecord(
            entry_date=history["date"].iloc[int(trade["entry_index"])].date(),
            exit_date=history["date"].iloc[int(trade["exit_index"])].date(),
            entry_price=float(trade["entry_price"]),
            exit_price=float(trade["exit_price"]),
            return_pct=float(trade["return_pct"]),
        )
        for trade in raw_trades
    ]

    return BacktestResult(
        strategy_id=request.strategy_id,
        symbol=request.symbol,
        annual_return=float(metrics["annual_return"]),
        max_drawdown=float(metrics["max_drawdown"]),
        win_rate=float(metrics["win_rate"]),
        sharpe_ratio=float(metrics["sharpe_ratio"]),
        total_trades=int(metrics["total_trades"]),
        equity_curve=equity_points,
        trades=trade_records,
    )
