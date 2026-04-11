from unittest.mock import Mock

import pytest

from routers import market as market_router
from schemas.market import StockQuote


pytestmark = pytest.mark.asyncio


def make_quote(symbol: str, price: float, name: str = "Test Quote") -> StockQuote:
    return StockQuote(
        symbol=symbol,
        name=name,
        price=price,
        change_pct=0.0,
        change_amount=0.0,
    )


async def test_market_quotes_returns_single_quote(client, monkeypatch) -> None:
    mock_fetch_quotes = Mock(return_value=[make_quote("600519", 1234.5)])
    monkeypatch.setattr(market_router, "fetch_quotes", mock_fetch_quotes)

    response = await client.get("/api/market/quotes?symbols=600519")

    assert response.status_code == 200
    assert response.json() == [
        {
            "symbol": "600519",
            "name": "Test Quote",
            "price": 1234.5,
            "change_pct": 0.0,
            "change_amount": 0.0,
        }
    ]
    mock_fetch_quotes.assert_called_once_with(["600519"])


async def test_market_quotes_returns_multiple_quotes(client, monkeypatch) -> None:
    mock_fetch_quotes = Mock(
        return_value=[
            make_quote("600519", 1234.5, name="Kweichow Moutai"),
            make_quote("000001", 10.2, name="Ping An Bank"),
        ]
    )
    monkeypatch.setattr(market_router, "fetch_quotes", mock_fetch_quotes)

    response = await client.get("/api/market/quotes?symbols=600519,000001")

    assert response.status_code == 200
    assert [item["symbol"] for item in response.json()] == ["600519", "000001"]
    mock_fetch_quotes.assert_called_once_with(["600519", "000001"])


async def test_market_quotes_returns_empty_list_for_empty_symbols(
    client,
    monkeypatch,
) -> None:
    mock_fetch_quotes = Mock(return_value=[])
    monkeypatch.setattr(market_router, "fetch_quotes", mock_fetch_quotes)

    response = await client.get("/api/market/quotes?symbols=")

    assert response.status_code == 200
    assert response.json() == []
    mock_fetch_quotes.assert_called_once_with([])


async def test_market_quotes_returns_502_on_upstream_failure(
    client,
    monkeypatch,
) -> None:
    def raise_upstream_error(_symbols: list[str]) -> list[StockQuote]:
        raise Exception("upstream failed")

    monkeypatch.setattr(market_router, "fetch_quotes", raise_upstream_error)

    response = await client.get("/api/market/quotes?symbols=600519")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Failed to fetch market quotes from upstream data source",
    }
