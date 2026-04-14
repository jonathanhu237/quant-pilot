import pandas as pd
import pytest

from services.strategies.bollinger import BollingerBandsStrategy
from services.strategies.dual_ma import DualMAStrategy
from services.strategies.kdj import KDJStrategy
from services.strategies.macd import MACDStrategy
from services.strategies.rsi import RSIStrategy


def make_price_frame(close: list[float]) -> pd.DataFrame:
    return pd.DataFrame({"close": close})


def make_ohlc_frame(close: list[float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "close": close,
            "high": [value + 0.5 for value in close],
            "low": [value - 0.5 for value in close],
        }
    )


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


def test_macd_generates_buy_and_sell_signals_on_crossovers() -> None:
    strategy = MACDStrategy({"fast_period": 3, "slow_period": 6, "signal_period": 3})
    prices = [10, 9, 8, 7, 6, 5, 6, 8, 10, 12, 14, 12, 10, 8, 6, 5]

    signals = strategy.generate_signals(make_price_frame(prices))

    assert len(signals) == len(prices)
    assert (signals == 1).any()
    assert (signals == -1).any()


def test_macd_rejects_invalid_period_ordering() -> None:
    strategy = MACDStrategy({"fast_period": 10, "slow_period": 5, "signal_period": 3})

    with pytest.raises(ValueError):
        strategy.generate_signals(make_price_frame([1, 2, 3, 4, 5]))


def test_kdj_emits_buy_signal_from_oversold_zone() -> None:
    strategy = KDJStrategy({"period": 3, "oversold": 80, "overbought": 90})
    prices = [10, 9, 8, 7, 6, 5, 4, 3, 2, 3, 5, 7, 9]

    signals = strategy.generate_signals(make_ohlc_frame(prices))

    assert len(signals) == len(prices)
    assert (signals == 1).any()


def test_kdj_rejects_invalid_zone_bounds() -> None:
    strategy = KDJStrategy({"period": 3, "oversold": 80, "overbought": 20})

    with pytest.raises(ValueError):
        strategy.generate_signals(make_ohlc_frame([1.0, 2.0, 3.0, 4.0]))


def test_bollinger_generates_signals_on_band_crossings() -> None:
    strategy = BollingerBandsStrategy({"period": 5, "std_dev": 1.0})
    prices = [10, 10, 10, 10, 10, 7, 11, 10, 10, 10, 13, 9]

    signals = strategy.generate_signals(make_price_frame(prices))

    assert len(signals) == len(prices)
    assert (signals == 1).any()
    assert (signals == -1).any()


def test_bollinger_rejects_non_positive_std_dev() -> None:
    strategy = BollingerBandsStrategy({"period": 5, "std_dev": 0})

    with pytest.raises(ValueError):
        strategy.generate_signals(make_price_frame([1, 2, 3, 4, 5, 6]))

