import pytest
from httpx import AsyncClient

from routers import signals as signals_router
from schemas.signal import StrategySignalSnapshot, SymbolSignalSnapshot


pytestmark = pytest.mark.asyncio


async def test_signals_returns_empty_for_no_watchlist(client: AsyncClient) -> None:
    response = await client.get("/api/signals/watchlist")

    assert response.status_code == 200
    assert response.json() == []


async def test_signals_returns_data_for_watchlist(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expected = [
        SymbolSignalSnapshot(
            symbol="600519",
            name="Kweichow Moutai",
            price=1830.0,
            change_pct=1.25,
            signals=[
                StrategySignalSnapshot(
                    strategy_id="dual_ma",
                    strategy_name="Dual Moving Average",
                    signal="buy",
                    signal_date="2024-01-05",
                )
            ],
        )
    ]
    async def fake_generate_watchlist_signals(_db: object) -> list[SymbolSignalSnapshot]:
        return expected

    monkeypatch.setattr(signals_router, "generate_watchlist_signals", fake_generate_watchlist_signals)

    response = await client.get("/api/signals/watchlist")

    assert response.status_code == 200
    assert response.json() == [snapshot.model_dump() for snapshot in expected]


async def test_signals_returns_502_on_error(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def raise_runtime_error(_db: object) -> list[SymbolSignalSnapshot]:
        raise RuntimeError("upstream failed")

    monkeypatch.setattr(signals_router, "generate_watchlist_signals", raise_runtime_error)

    response = await client.get("/api/signals/watchlist")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Failed to fetch strategy signals from upstream data source",
    }
