import pandas as pd

from schemas.strategy import StrategyParameterDefinition
from services.strategies.base import BaseStrategy


class BollingerBandsStrategy(BaseStrategy):
    strategy_id = "bollinger"
    name = "Bollinger Bands Reversion"
    description = (
        "Buy when the close crosses back above the lower band, and sell when it"
        " crosses back below the upper band."
    )
    parameters = [
        StrategyParameterDefinition(
            name="period",
            type="integer",
            default=20,
            min=5,
            max=120,
            step=1,
        ),
        StrategyParameterDefinition(
            name="std_dev",
            type="float",
            default=2.0,
            min=0.5,
            max=5.0,
            step=0.1,
        ),
    ]

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        period = int(self.params["period"])
        std_dev = float(self.params["std_dev"])

        if std_dev <= 0:
            raise ValueError("std_dev must be positive")

        close = data["close"].astype(float)
        middle = close.rolling(window=period, min_periods=period).mean()
        rolling_std = close.rolling(window=period, min_periods=period).std(ddof=0)
        upper_band = middle + std_dev * rolling_std
        lower_band = middle - std_dev * rolling_std

        signals = pd.Series(0, index=data.index, dtype=int)
        cross_up_from_below = (close > lower_band) & (close.shift(1) <= lower_band.shift(1))
        cross_down_from_above = (close < upper_band) & (close.shift(1) >= upper_band.shift(1))

        signals.loc[cross_up_from_below.fillna(False)] = 1
        signals.loc[cross_down_from_above.fillna(False)] = -1
        return signals
