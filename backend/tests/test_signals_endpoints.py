import pytest
from httpx import AsyncClient

from routers import signals as signals_router
from schemas.signal_history import SignalHistoryEntry
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


async def test_snapshot_endpoint_returns_inserted_count(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_snapshot_watchlist_signals(_db: object) -> int:
        return 3

    monkeypatch.setattr(signals_router, "snapshot_watchlist_signals", fake_snapshot_watchlist_signals)

    response = await client.post("/api/signals/snapshot")

    assert response.status_code == 200
    assert response.json() == {"inserted": 3}


async def test_snapshot_endpoint_returns_502_on_error(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def raise_runtime_error(_db: object) -> int:
        raise RuntimeError("upstream failed")

    monkeypatch.setattr(signals_router, "snapshot_watchlist_signals", raise_runtime_error)

    response = await client.post("/api/signals/snapshot")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Failed to persist strategy signals",
    }


async def test_history_endpoint_returns_entries(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expected = [
        SignalHistoryEntry(
            symbol="600519",
            strategy_id="dual_ma",
            strategy_name="Dual Moving Average",
            signal="buy",
            signal_date="2024-01-05",
        )
    ]

    async def fake_get_signal_history(_db: object, _symbol: str, _days: int) -> list[SignalHistoryEntry]:
        return expected

    monkeypatch.setattr(signals_router, "get_signal_history", fake_get_signal_history)

    response = await client.get("/api/signals/history/600519?days=30")

    assert response.status_code == 200
    assert response.json() == [entry.model_dump() for entry in expected]


async def test_history_endpoint_rejects_invalid_symbol(client: AsyncClient) -> None:
    response = await client.get("/api/signals/history/ABC?days=30")

    assert response.status_code == 400
    assert response.json() == {"detail": "Symbol must be a 6-digit numeric code"}


async def test_history_endpoint_rejects_too_many_days(client: AsyncClient) -> None:
    response = await client.get("/api/signals/history/600519?days=500")

    assert response.status_code == 400
    assert response.json() == {"detail": "days must be between 1 and 180"}
