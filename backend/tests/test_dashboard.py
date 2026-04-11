import pytest
from httpx import AsyncClient

from routers import dashboard as dashboard_router
from schemas.market import StockQuote
from services import trading as trading_service


pytestmark = pytest.mark.asyncio


def make_quote(symbol: str, price: float, name: str = "Test Quote") -> StockQuote:
    return StockQuote(
        symbol=symbol,
        name=name,
        price=price,
        change_pct=0.0,
        change_amount=0.0,
    )


def patch_quote_map(
    monkeypatch: pytest.MonkeyPatch,
    prices: dict[str, float],
) -> None:
    def fake_fetch_quote_map(symbols: list[str]) -> dict[str, StockQuote]:
        return {
            symbol: make_quote(symbol, prices[symbol], name=f"Quote {symbol}")
            for symbol in symbols
            if symbol in prices
        }

    monkeypatch.setattr(trading_service, "fetch_quote_map", fake_fetch_quote_map)


async def test_dashboard_returns_defaults_for_empty_database(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {})
    monkeypatch.setattr(dashboard_router, "fetch_market_quotes", lambda _symbols: [])

    response = await client.get("/api/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "account_summary": {
            "total_assets": 100000.0,
            "total_return_rate": 0.0,
        },
        "recent_trades": [],
        "watchlist_quotes": [],
    }


async def test_dashboard_includes_recent_trade_after_buy(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {"600519": 10.0})
    monkeypatch.setattr(dashboard_router, "fetch_market_quotes", lambda _symbols: [])

    buy_response = await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 100},
    )
    dashboard_response = await client.get("/api/dashboard")

    assert buy_response.status_code == 200
    assert dashboard_response.status_code == 200

    payload = dashboard_response.json()
    assert len(payload["recent_trades"]) == 1
    assert payload["recent_trades"][0]["symbol"] == "600519"
    assert payload["recent_trades"][0]["side"] == "buy"


async def test_dashboard_includes_watchlist_quotes(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {})
    monkeypatch.setattr(
        dashboard_router,
        "fetch_market_quotes",
        lambda _symbols: [make_quote("600519", 1234.5, name="Kweichow Moutai")],
    )

    watchlist_response = await client.post(
        "/api/watchlist/",
        json={"symbol": "600519"},
    )
    dashboard_response = await client.get("/api/dashboard")

    assert watchlist_response.status_code == 201
    assert dashboard_response.status_code == 200

    payload = dashboard_response.json()
    assert payload["watchlist_quotes"] == [
        {
            "symbol": "600519",
            "name": "Kweichow Moutai",
            "price": 1234.5,
            "change_pct": 0.0,
        }
    ]


async def test_dashboard_returns_graceful_defaults_when_quotes_fail(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_quote_error(_symbols: list[str]) -> dict[str, StockQuote]:
        raise RuntimeError("quote fetch failed")

    def raise_watchlist_error(_symbols: list[str]) -> list[StockQuote]:
        raise RuntimeError("watchlist fetch failed")

    monkeypatch.setattr(trading_service, "fetch_quote_map", raise_quote_error)
    monkeypatch.setattr(dashboard_router, "fetch_market_quotes", raise_watchlist_error)

    response = await client.get("/api/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "account_summary": {
            "total_assets": 100000.0,
            "total_return_rate": 0.0,
        },
        "recent_trades": [],
        "watchlist_quotes": [],
    }
