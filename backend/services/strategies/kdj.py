import pandas as pd

from schemas.strategy import StrategyParameterDefinition
from services.strategies.base import BaseStrategy


class KDJStrategy(BaseStrategy):
    strategy_id = "kdj"
    name = "KDJ"
    description = (
        "Buy when the K line crosses above the D line inside the oversold zone,"
        " and sell when K crosses below D inside the overbought zone."
    )
    parameters = [
        StrategyParameterDefinition(
            name="period",
            type="integer",
            default=9,
            min=3,
            max=60,
            step=1,
        ),
        StrategyParameterDefinition(
            name="oversold",
            type="float",
            default=20,
            min=1,
            max=50,
            step=1,
        ),
        StrategyParameterDefinition(
            name="overbought",
            type="float",
            default=80,
            min=50,
            max=99,
            step=1,
        ),
    ]

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        period = int(self.params["period"])
        oversold = float(self.params["oversold"])
        overbought = float(self.params["overbought"])

        if oversold >= overbought:
            raise ValueError("oversold must be smaller than overbought")

        close = data["close"].astype(float)
        high = data["high"].astype(float) if "high" in data else close
        low = data["low"].astype(float) if "low" in data else close

        lowest_low = low.rolling(window=period, min_periods=period).min()
        highest_high = high.rolling(window=period, min_periods=period).max()
        span = (highest_high - lowest_low).replace(0, pd.NA)
        rsv = ((close - lowest_low) / span) * 100

        k_line = rsv.ewm(alpha=1 / 3, adjust=False).mean()
        d_line = k_line.ewm(alpha=1 / 3, adjust=False).mean()

        signals = pd.Series(0, index=data.index, dtype=int)
        bullish_cross = (k_line > d_line) & (k_line.shift(1) <= d_line.shift(1))
        bearish_cross = (k_line < d_line) & (k_line.shift(1) >= d_line.shift(1))

        buy_signal = bullish_cross & (d_line < oversold)
        sell_signal = bearish_cross & (d_line > overbought)

        signals.loc[buy_signal.fillna(False)] = 1
        signals.loc[sell_signal.fillna(False)] = -1
        return signals
