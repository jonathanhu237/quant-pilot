import pandas as pd

from schemas.strategy import StrategyParameterDefinition
from services.strategies.base import BaseStrategy


class RSIStrategy(BaseStrategy):
    strategy_id = "rsi"
    name = "RSI Overbought/Oversold"
    description = "Buy when RSI is oversold and sell when it is overbought."
    parameters = [
        StrategyParameterDefinition(
            name="period",
            type="integer",
            default=14,
            min=2,
            max=60,
            step=1,
        ),
        StrategyParameterDefinition(
            name="oversold",
            type="float",
            default=30,
            min=1,
            max=50,
            step=1,
        ),
        StrategyParameterDefinition(
            name="overbought",
            type="float",
            default=70,
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
        delta = close.diff()
        gains = delta.clip(lower=0)
        losses = -delta.clip(upper=0)

        average_gain = gains.rolling(window=period, min_periods=period).mean()
        average_loss = losses.rolling(window=period, min_periods=period).mean()
        relative_strength = average_gain / average_loss.replace(0, pd.NA)
        rsi = 100 - (100 / (1 + relative_strength))

        signals = pd.Series(0, index=data.index, dtype=int)
        buy_signal = (rsi < oversold) & (rsi.shift(1) >= oversold)
        sell_signal = (rsi > overbought) & (rsi.shift(1) <= overbought)

        signals.loc[buy_signal.fillna(False)] = 1
        signals.loc[sell_signal.fillna(False)] = -1
        return signals
