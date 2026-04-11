from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.watchlist import Watchlist


pytestmark = pytest.mark.asyncio


async def create_watchlist_item(client: AsyncClient, symbol: str):
    return await client.post("/api/watchlist/", json={"symbol": symbol})


async def test_watchlist_starts_empty(client: AsyncClient) -> None:
    response = await client.get("/api/watchlist/")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_watchlist_item_returns_created_item(client: AsyncClient) -> None:
    response = await create_watchlist_item(client, "600519")

    payload = response.json()
    assert response.status_code == 201
    assert payload["symbol"] == "600519"
    assert payload["id"] > 0
    assert payload["created_at"]


async def test_create_watchlist_item_normalizes_symbol_to_uppercase(
    client: AsyncClient,
) -> None:
    response = await create_watchlist_item(client, "sh600519")

    assert response.status_code == 201
    assert response.json()["symbol"] == "SH600519"


async def test_create_watchlist_item_rejects_duplicate_symbol(
    client: AsyncClient,
) -> None:
    await create_watchlist_item(client, "600519")

    response = await create_watchlist_item(client, "600519")

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Symbol already exists in watchlist",
    }


async def test_watchlist_returns_newest_items_first(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    first = await create_watchlist_item(client, "600519")
    second = await create_watchlist_item(client, "000001")

    result = await db_session.execute(select(Watchlist).order_by(Watchlist.id.asc()))
    items = list(result.scalars().all())
    now = datetime.now(timezone.utc)
    items[0].created_at = now - timedelta(minutes=1)
    items[1].created_at = now
    await db_session.commit()

    response = await client.get("/api/watchlist/")
    payload = response.json()

    assert response.status_code == 200
    assert [item["symbol"] for item in payload] == ["000001", "600519"]
    assert payload[0]["id"] == second.json()["id"]
    assert payload[1]["id"] == first.json()["id"]


async def test_delete_watchlist_item_removes_item(client: AsyncClient) -> None:
    await create_watchlist_item(client, "600519")

    response = await client.delete("/api/watchlist/600519")
    follow_up = await client.get("/api/watchlist/")

    assert response.status_code == 204
    assert follow_up.json() == []


async def test_delete_missing_watchlist_item_returns_404(client: AsyncClient) -> None:
    response = await client.delete("/api/watchlist/600519")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Symbol not found in watchlist",
    }


async def test_delete_watchlist_item_is_case_insensitive(client: AsyncClient) -> None:
    await create_watchlist_item(client, "sh600519")

    response = await client.delete("/api/watchlist/Sh600519")
    follow_up = await client.get("/api/watchlist/")

    assert response.status_code == 204
    assert follow_up.json() == []
