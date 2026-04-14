import pandas as pd

from schemas.strategy import StrategyParameterDefinition
from services.strategies.base import BaseStrategy


class MACDStrategy(BaseStrategy):
    strategy_id = "macd"
    name = "MACD"
    description = (
        "Buy when the MACD line crosses above its signal line, and sell on the"
        " reverse crossover."
    )
    parameters = [
        StrategyParameterDefinition(
            name="fast_period",
            type="integer",
            default=12,
            min=2,
            max=60,
            step=1,
        ),
        StrategyParameterDefinition(
            name="slow_period",
            type="integer",
            default=26,
            min=5,
            max=200,
            step=1,
        ),
        StrategyParameterDefinition(
            name="signal_period",
            type="integer",
            default=9,
            min=2,
            max=60,
            step=1,
        ),
    ]

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        fast_period = int(self.params["fast_period"])
        slow_period = int(self.params["slow_period"])
        signal_period = int(self.params["signal_period"])

        if fast_period >= slow_period:
            raise ValueError("fast_period must be smaller than slow_period")

        close = data["close"].astype(float)
        fast_ema = close.ewm(span=fast_period, adjust=False).mean()
        slow_ema = close.ewm(span=slow_period, adjust=False).mean()
        macd_line = fast_ema - slow_ema
        signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()

        signals = pd.Series(0, index=data.index, dtype=int)
        crossover_up = (macd_line > signal_line) & (macd_line.shift(1) <= signal_line.shift(1))
        crossover_down = (macd_line < signal_line) & (macd_line.shift(1) >= signal_line.shift(1))

        signals.loc[crossover_up.fillna(False)] = 1
        signals.loc[crossover_down.fillna(False)] = -1
        return signals
