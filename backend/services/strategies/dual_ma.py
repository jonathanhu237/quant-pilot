import pandas as pd

from schemas.strategy import StrategyParameterDefinition
from services.strategies.base import BaseStrategy


class DualMAStrategy(BaseStrategy):
    strategy_id = "dual_ma"
    name = "Dual Moving Average"
    description = "Buy when the short moving average crosses above the long moving average."
    parameters = [
        StrategyParameterDefinition(
            name="short_window",
            type="integer",
            default=10,
            min=2,
            max=120,
            step=1,
        ),
        StrategyParameterDefinition(
            name="long_window",
            type="integer",
            default=30,
            min=5,
            max=250,
            step=1,
        ),
    ]

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        short_window = int(self.params["short_window"])
        long_window = int(self.params["long_window"])

        if short_window >= long_window:
            raise ValueError("short_window must be smaller than long_window")

        close = data["close"].astype(float)
        short_ma = close.rolling(window=short_window, min_periods=short_window).mean()
        long_ma = close.rolling(window=long_window, min_periods=long_window).mean()

        signals = pd.Series(0, index=data.index, dtype=int)
        crossover_up = (short_ma > long_ma) & (short_ma.shift(1) <= long_ma.shift(1))
        crossover_down = (short_ma < long_ma) & (short_ma.shift(1) >= long_ma.shift(1))

        signals.loc[crossover_up.fillna(False)] = 1
        signals.loc[crossover_down.fillna(False)] = -1
        return signals
