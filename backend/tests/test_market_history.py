from __future__ import annotations

from collections.abc import Callable
from datetime import date, timedelta

import pytest

from routers import market as market_router
from schemas.market import KlineResponse
from services import market_history


def make_kline_rows(total: int = 100) -> list[list[str]]:
    start = date(2025, 1, 2)
    rows: list[list[str]] = []

    for index in range(total):
        current = start + timedelta(days=index)
        open_price = 100 + index
        close_price = open_price + (index % 5) - 2
        high_price = max(open_price, close_price) + 3
        low_price = min(open_price, close_price) - 3
        volume = 1_000_000 + index * 1_000
        rows.append(
            [
                current.isoformat(),
                f"{open_price:.2f}",
                f"{close_price:.2f}",
                f"{high_price:.2f}",
                f"{low_price:.2f}",
                str(volume),
            ]
        )

    return rows


@pytest.fixture(autouse=True)
def clear_market_history_cache() -> None:
    market_history.clear_market_history_cache()


@pytest.fixture
def stub_quote_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        market_history,
        "fetch_quote_snapshot",
        lambda _symbol: {
            "high": 122.0,
            "low": 101.0,
            "open": 110.0,
            "prev_close": 108.0,
        },
    )


@pytest.mark.parametrize("range_value", ["1M", "3M", "6M", "1Y", "ALL"])
def test_get_market_history_returns_expected_shape_for_each_range(
    monkeypatch: pytest.MonkeyPatch,
    range_value: str,
    stub_quote_snapshot: None,
) -> None:
    rows = make_kline_rows()
    monkeypatch.setattr(market_history, "fetch_kline_page", lambda *_args: rows)

    response = market_history.get_market_history("600519", range_value)

    assert isinstance(response, KlineResponse)
    assert response.symbol == "600519"
    assert response.name == "600519"
    assert response.range == range_value
    assert len(response.bars) > 0
    assert len(response.ma5) == len(response.bars)
    assert len(response.ma20) == len(response.bars)
    assert len(response.ma60) == len(response.bars)
    assert len(response.rsi14) == len(response.bars)
    assert response.bars == sorted(response.bars, key=lambda bar: bar.date)
    assert response.basic_info.prev_close == pytest.approx(108.0)
    assert response.basic_info.open == pytest.approx(110.0)
    assert response.basic_info.high == pytest.approx(122.0)
    assert response.basic_info.low == pytest.approx(101.0)


def test_get_market_history_returns_signals_for_every_registered_strategy(
    monkeypatch: pytest.MonkeyPatch,
    stub_quote_snapshot: None,
) -> None:
    monkeypatch.setattr(market_history, "fetch_kline_page", lambda *_args: make_kline_rows())

    response = market_history.get_market_history("600519", "1M")

    expected_strategy_ids = set(market_history.STRATEGY_REGISTRY.keys())
    assert set(response.signals.keys()) == expected_strategy_ids
    for series in response.signals.values():
        assert len(series) == len(response.bars)
        assert all(value in {-1, 0, 1} for value in series)


def test_get_market_history_signals_fall_back_to_zero_when_strategy_raises(
    monkeypatch: pytest.MonkeyPatch,
    stub_quote_snapshot: None,
) -> None:
    monkeypatch.setattr(market_history, "fetch_kline_page", lambda *_args: make_kline_rows())

    class ExplodingStrategy:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        def generate_signals(self, _data):
            raise RuntimeError("boom")

    fake_registry = {**market_history.STRATEGY_REGISTRY, "boom": ExplodingStrategy}
    monkeypatch.setattr(market_history, "STRATEGY_REGISTRY", fake_registry)

    response = market_history.get_market_history("600519", "1M")

    assert "boom" in response.signals
    assert response.signals["boom"] == [0] * len(response.bars)
    for strategy_id in market_history.STRATEGY_REGISTRY:
        assert strategy_id in response.signals


def test_get_market_history_aligns_ma_with_leading_none(
    monkeypatch: pytest.MonkeyPatch,
    stub_quote_snapshot: None,
) -> None:
    monkeypatch.setattr(market_history, "fetch_kline_page", lambda *_args: make_kline_rows())

    response = market_history.get_market_history("600519", "1M")

    assert response.ma5[:4] == [None, None, None, None]
    assert response.ma5[4] is not None


def test_get_market_history_aligns_rsi_with_leading_none(
    monkeypatch: pytest.MonkeyPatch,
    stub_quote_snapshot: None,
) -> None:
    monkeypatch.setattr(market_history, "fetch_kline_page", lambda *_args: make_kline_rows())

    response = market_history.get_market_history("600519", "1M")

    assert response.rsi14[:13] == [None] * 13
    assert response.rsi14[13] is not None


def test_get_market_history_uses_cache_within_ttl(
    monkeypatch: pytest.MonkeyPatch,
    stub_quote_snapshot: None,
) -> None:
    calls = 0
    now = 1_000.0

    def fake_fetch_kline_page(*_args) -> list[list[str]]:
        nonlocal calls
        calls += 1
        return make_kline_rows()

    monkeypatch.setattr(market_history, "fetch_kline_page", fake_fetch_kline_page)
    monkeypatch.setattr(
        market_history,
        "time",
        type(
            "FakeTime",
            (),
            {
                "monotonic": staticmethod(lambda: now),
            },
        )(),
    )

    first = market_history.get_market_history("600519", "1M")
    second = market_history.get_market_history("600519", "1M")

    assert calls == 1
    assert first == second


def test_get_market_history_rejects_invalid_symbol() -> None:
    with pytest.raises(ValueError, match="Invalid symbol format"):
        market_history.get_market_history("abc", "1M")


def test_get_market_history_raises_when_upstream_returns_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(market_history, "fetch_kline_page", lambda *_args: [])

    with pytest.raises(ValueError, match="No historical data available"):
        market_history.get_market_history("600519", "1M")


@pytest.mark.asyncio
async def test_market_kline_endpoint_returns_422_for_invalid_symbol(client) -> None:
    response = await client.get("/api/market/abc/kline?range=1M")

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_market_kline_endpoint_maps_value_error_to_404(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_not_found(_symbol: str, _range: str) -> KlineResponse:
        raise ValueError("No historical data available")

    monkeypatch.setattr(market_router, "get_market_history", raise_not_found)

    response = await client.get("/api/market/600519/kline?range=1M")

    assert response.status_code == 404
    assert response.json() == {"detail": "No historical data available"}


@pytest.mark.asyncio
async def test_market_kline_endpoint_maps_unexpected_error_to_502(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_upstream_error(_symbol: str, _range: str) -> KlineResponse:
        raise RuntimeError("boom")

    monkeypatch.setattr(market_router, "get_market_history", raise_upstream_error)

    response = await client.get("/api/market/600519/kline?range=1M")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Failed to fetch market kline data from upstream data source",
    }
