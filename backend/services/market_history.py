from __future__ import annotations

import re
import time
from datetime import date, timedelta

import pandas as pd

from schemas.market import KlineBar, KlineBasicInfo, KlineRange, KlineResponse
from services.backtest import STRATEGY_REGISTRY
from services.quotes import fetch_quote_snapshot, to_tencent_symbol
from services.signals import generate_signal_series_for_history
from services.tencent_kline import fetch_kline_page

SYMBOL_PATTERN = re.compile(r"^\d{6}$")
CACHE_TTL_SECONDS = 60
_CACHE: dict[tuple[str, str], tuple[float, KlineResponse]] = {}
RANGE_CONFIG: dict[KlineRange, tuple[int | None, int]] = {
    "1M": (31, 22),
    "3M": (92, 66),
    "6M": (183, 132),
    "1Y": (366, 252),
    "ALL": (None, 640),
}


def clear_market_history_cache() -> None:
    _CACHE.clear()


def _validate_symbol(symbol: str) -> str:
    normalized = symbol.strip()
    if not SYMBOL_PATTERN.fullmatch(normalized):
        raise ValueError("Invalid symbol format")
    return normalized


def _resolve_range(range_value: KlineRange) -> tuple[date, int]:
    days_back, target_row_count = RANGE_CONFIG[range_value]
    end_date = date.today()
    start_date = date(1990, 1, 1) if days_back is None else end_date - timedelta(days=days_back)
    return start_date, target_row_count


def _fetch_history_rows(full_symbol: str, start_date: date, target_row_count: int) -> list[list[str]]:
    all_rows: list[list[str]] = []
    current_end = date.today()
    seen: set[str] = set()

    while True:
        page = fetch_kline_page(full_symbol, start_date, current_end)
        if not page:
            break

        rows_before = len(seen)
        for row in page:
            if row[0] in seen:
                continue
            seen.add(row[0])
            all_rows.append(row)

        if len(seen) == rows_before:
            break

        if len(seen) >= target_row_count:
            break

        earliest_row_date = page[0][0]
        if earliest_row_date <= start_date.isoformat():
            break

        current_end = date.fromisoformat(earliest_row_date) - timedelta(days=1)

    return all_rows


def _build_frame(rows: list[list[str]], target_row_count: int) -> pd.DataFrame:
    frame = pd.DataFrame(rows, columns=["date", "open", "close", "high", "low", "volume"])
    frame["date"] = pd.to_datetime(frame["date"])
    for column in ["open", "close", "high", "low", "volume"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame = (
        frame.dropna(subset=["date", "open", "close", "high", "low", "volume"])
        .sort_values("date")
        .tail(target_row_count)
        .reset_index(drop=True)
    )
    return frame


def _series_to_optional_floats(series: pd.Series) -> list[float | None]:
    return [None if pd.isna(value) else float(value) for value in series.tolist()]


def _calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff().fillna(0.0)
    gains = delta.clip(lower=0.0)
    losses = (-delta.clip(upper=0.0)).astype(float)
    avg_gain = gains.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = losses.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    relative_strength = avg_gain / avg_loss.replace(0.0, pd.NA)
    rsi = 100 - (100 / (1 + relative_strength))
    rsi = rsi.mask((avg_loss == 0) & (avg_gain > 0), 100.0)
    rsi = rsi.mask((avg_gain == 0) & (avg_loss > 0), 0.0)
    rsi = rsi.mask((avg_gain == 0) & (avg_loss == 0), 50.0)
    return rsi


def _load_quote_snapshot(symbol: str) -> dict[str, str | float | None] | None:
    try:
        return fetch_quote_snapshot(symbol)
    except Exception:
        return None


def get_market_history(symbol: str, range_value: KlineRange = "1M") -> KlineResponse:
    normalized_symbol = _validate_symbol(symbol)
    cache_key = (normalized_symbol, range_value)
    cached = _CACHE.get(cache_key)
    now = time.monotonic()
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    start_date, target_row_count = _resolve_range(range_value)
    full_symbol = to_tencent_symbol(normalized_symbol)
    rows = _fetch_history_rows(full_symbol, start_date, target_row_count)
    if not rows:
        raise ValueError("No historical data available")

    frame = _build_frame(rows, target_row_count)
    if frame.empty:
        raise ValueError("No historical data available")

    quote_snapshot = _load_quote_snapshot(normalized_symbol)
    close = frame["close"]
    response = KlineResponse(
        symbol=normalized_symbol,
        name=str(quote_snapshot["name"]) if quote_snapshot and quote_snapshot.get("name") else normalized_symbol,
        range=range_value,
        bars=[
            KlineBar(
                date=row.date.strftime("%Y-%m-%d"),
                open=float(row.open),
                high=float(row.high),
                low=float(row.low),
                close=float(row.close),
                volume=float(row.volume),
            )
            for row in frame.itertuples(index=False)
        ],
        ma5=_series_to_optional_floats(close.rolling(window=5, min_periods=5).mean()),
        ma20=_series_to_optional_floats(close.rolling(window=20, min_periods=20).mean()),
        ma60=_series_to_optional_floats(close.rolling(window=60, min_periods=60).mean()),
        rsi14=_series_to_optional_floats(_calculate_rsi(close)),
        signals=generate_signal_series_for_history(frame, STRATEGY_REGISTRY),
        basic_info=KlineBasicInfo(
            prev_close=float(quote_snapshot["prev_close"]) if quote_snapshot and quote_snapshot.get("prev_close") is not None else None,
            open=float(quote_snapshot["open"]) if quote_snapshot and quote_snapshot.get("open") is not None else None,
            high=float(quote_snapshot["high"]) if quote_snapshot and quote_snapshot.get("high") is not None else None,
            low=float(quote_snapshot["low"]) if quote_snapshot and quote_snapshot.get("low") is not None else None,
        ),
    )
    _CACHE[cache_key] = (now, response)
    return response
