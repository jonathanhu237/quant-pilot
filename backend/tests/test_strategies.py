import pandas as pd

from services.strategies.dual_ma import DualMAStrategy
from services.strategies.rsi import RSIStrategy


def make_price_frame(close: list[float]) -> pd.DataFrame:
    return pd.DataFrame({"close": close})


def test_dual_ma_emits_buy_signal_on_bullish_crossover() -> None:
    strategy = DualMAStrategy({"short_window": 2, "long_window": 3})

    signals = strategy.generate_signals(make_price_frame([5, 4, 3, 4, 5]))

    assert signals.tolist() == [0, 0, 0, 0, 1]


def test_dual_ma_emits_sell_signal_on_bearish_crossover() -> None:
    strategy = DualMAStrategy({"short_window": 2, "long_window": 3})

    signals = strategy.generate_signals(make_price_frame([3, 4, 5, 4, 3]))

    assert signals.tolist() == [0, 0, 0, 0, -1]


def test_rsi_emits_buy_signal_when_crossing_below_oversold() -> None:
    strategy = RSIStrategy({"period": 2, "oversold": 40, "overbought": 60})

    signals = strategy.generate_signals(make_price_frame([10, 11, 10, 8]))

    assert signals.tolist() == [0, 0, 0, 1]


def test_rsi_emits_sell_signal_when_crossing_above_overbought() -> None:
    strategy = RSIStrategy({"period": 3, "oversold": 40, "overbought": 60})

    signals = strategy.generate_signals(make_price_frame([10, 9, 8, 9, 10]))

    assert signals.tolist() == [0, 0, 0, 0, -1]


def test_rsi_handles_zero_average_loss_without_crashing() -> None:
    strategy = RSIStrategy({"period": 2, "oversold": 30, "overbought": 70})

    signals = strategy.generate_signals(make_price_frame([10, 11, 12, 13, 14]))

    assert signals.tolist() == [0, 0, 0, 0, 0]

