from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.trading import Account, Position
from routers.trading import router as trading_router
from schemas.market import StockQuote
from schemas.trading import TradeRequest
from services import trading as trading_service


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

@pytest.mark.asyncio
async def test_buy_decreases_cash_and_creates_position(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    response = await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "buy",
    )

    account = (await db_session.execute(select(Account).limit(1))).scalar_one()
    position = (
        await db_session.execute(select(Position).where(Position.symbol == "600519"))
    ).scalar_one()

    assert response.cash_balance == pytest.approx(99000.0)
    assert account.cash_balance == pytest.approx(99000.0)
    assert position.shares == 100
    assert position.average_cost == pytest.approx(10.0)


@pytest.mark.asyncio
async def test_second_buy_recalculates_average_cost(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "buy",
    )

    prices["600519"] = 20.0
    await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "buy",
    )

    account = (await db_session.execute(select(Account).limit(1))).scalar_one()
    position = (
        await db_session.execute(select(Position).where(Position.symbol == "600519"))
    ).scalar_one()

    assert account.cash_balance == pytest.approx(97000.0)
    assert position.shares == 200
    assert position.average_cost == pytest.approx(15.0)


@pytest.mark.asyncio
async def test_buy_rejects_when_cash_is_insufficient(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 200.0}
    patch_quote_map(monkeypatch, prices)

    with pytest.raises(HTTPException) as exc_info:
        await trading_service.execute_trade(
            db_session,
            TradeRequest(symbol="600519", shares=1000),
            "buy",
        )

    error = exc_info.value
    assert getattr(error, "status_code") == 400
    assert error.detail["error_code"] == "insufficient_cash"
    assert error.detail["message"] == "Insufficient cash balance"


@pytest.mark.asyncio
async def test_sell_decreases_position_and_increases_cash(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "buy",
    )

    prices["600519"] = 12.0
    response = await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=40),
        "sell",
    )

    account = (await db_session.execute(select(Account).limit(1))).scalar_one()
    position = (
        await db_session.execute(select(Position).where(Position.symbol == "600519"))
    ).scalar_one()

    assert response.cash_balance == pytest.approx(99480.0)
    assert account.cash_balance == pytest.approx(99480.0)
    assert position.shares == 60


@pytest.mark.asyncio
async def test_full_sell_deletes_position(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "buy",
    )

    prices["600519"] = 12.0
    await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "sell",
    )

    position = (
        await db_session.execute(select(Position).where(Position.symbol == "600519"))
    ).scalar_one_or_none()

    assert position is None


@pytest.mark.asyncio
async def test_sell_rejects_when_position_is_insufficient(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    with pytest.raises(HTTPException) as exc_info:
        await trading_service.execute_trade(
            db_session,
            TradeRequest(symbol="600519", shares=10),
            "sell",
        )

    error = exc_info.value
    assert getattr(error, "status_code") == 400
    assert error.detail["error_code"] == "insufficient_position"
    assert error.detail["message"] == "Insufficient position size"


@pytest.mark.asyncio
async def test_account_response_computes_portfolio_metrics(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await trading_service.execute_trade(
        db_session,
        TradeRequest(symbol="600519", shares=100),
        "buy",
    )

    prices["600519"] = 12.0
    response = await trading_service.build_account_response(db_session)

    assert response.cash_balance == pytest.approx(99000.0)
    assert response.market_value == pytest.approx(1200.0)
    assert response.total_assets == pytest.approx(100200.0)
    assert response.total_pnl == pytest.approx(200.0)
    assert response.total_return_rate == pytest.approx(0.002)
    assert response.positions[0].name == "Quote 600519"


@pytest.mark.asyncio
async def test_buy_endpoint_returns_structured_error_detail(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 200.0}
    patch_quote_map(monkeypatch, prices)

    app = FastAPI()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(trading_router)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/trading/buy",
            json={"symbol": "600519", "shares": 1000},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": {
            "error_code": "insufficient_cash",
            "message": "Insufficient cash balance",
        }
    }


@pytest.mark.asyncio
async def test_buy_endpoint_succeeds(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {"600519": 10.0})

    response = await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 100},
    )

    assert response.status_code == 200
    assert response.json() == {
        "side": "buy",
        "symbol": "600519",
        "shares": 100,
        "price": 10.0,
        "cash_balance": 99000.0,
    }


@pytest.mark.asyncio
async def test_sell_endpoint_succeeds_after_buy(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 100},
    )

    prices["600519"] = 12.0
    response = await client.post(
        "/api/trading/sell",
        json={"symbol": "600519", "shares": 40},
    )

    assert response.status_code == 200
    assert response.json() == {
        "side": "sell",
        "symbol": "600519",
        "shares": 40,
        "price": 12.0,
        "cash_balance": 99480.0,
    }


@pytest.mark.asyncio
async def test_sell_endpoint_rejects_missing_position(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {"600519": 10.0})

    response = await client.post(
        "/api/trading/sell",
        json={"symbol": "600519", "shares": 10},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": {
            "error_code": "insufficient_position",
            "message": "Insufficient position size",
        }
    }


@pytest.mark.asyncio
async def test_buy_endpoint_returns_not_found_when_quote_is_missing(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {})

    response = await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 100},
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": {
            "error_code": "quote_unavailable",
            "message": "Live quote not available for the selected symbol",
        }
    }


@pytest.mark.asyncio
async def test_get_account_endpoint_returns_initial_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_quote_map(monkeypatch, {})

    response = await client.get("/api/trading/account")

    assert response.status_code == 200
    assert response.json() == {
        "cash_balance": 100000.0,
        "market_value": 0.0,
        "total_assets": 100000.0,
        "total_pnl": 0.0,
        "total_return_rate": 0.0,
        "positions": [],
    }


@pytest.mark.asyncio
async def test_get_account_endpoint_uses_latest_quote_for_position_values(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 100},
    )

    prices["600519"] = 12.0
    response = await client.get("/api/trading/account")

    assert response.status_code == 200
    payload = response.json()

    assert payload["cash_balance"] == pytest.approx(99000.0)
    assert payload["market_value"] == pytest.approx(1200.0)
    assert payload["total_assets"] == pytest.approx(100200.0)
    assert payload["total_pnl"] == pytest.approx(200.0)
    assert payload["total_return_rate"] == pytest.approx(0.002)
    assert payload["positions"] == [
        {
            "symbol": "600519",
            "name": "Quote 600519",
            "shares": 100,
            "average_cost": 10.0,
            "current_price": 12.0,
            "market_value": 1200.0,
            "unrealized_pnl": 200.0,
            "unrealized_pnl_pct": 0.2,
        }
    ]


@pytest.mark.asyncio
async def test_get_trade_history_endpoint_returns_empty_list_initially(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/trading/history")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_trade_history_endpoint_returns_reverse_chronological_order(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prices = {"600519": 10.0}
    patch_quote_map(monkeypatch, prices)

    await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 100},
    )

    prices["600519"] = 12.0
    await client.post(
        "/api/trading/sell",
        json={"symbol": "600519", "shares": 40},
    )

    response = await client.get("/api/trading/history")

    assert response.status_code == 200
    payload = response.json()

    assert len(payload) == 2
    assert [trade["side"] for trade in payload] == ["sell", "buy"]
    assert [trade["symbol"] for trade in payload] == ["600519", "600519"]


@pytest.mark.asyncio
async def test_buy_endpoint_rejects_invalid_symbol(client: AsyncClient) -> None:
    response = await client.post(
        "/api/trading/buy",
        json={"symbol": "INVALID", "shares": 100},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_buy_endpoint_rejects_non_positive_shares(client: AsyncClient) -> None:
    response = await client.post(
        "/api/trading/buy",
        json={"symbol": "600519", "shares": 0},
    )

    assert response.status_code == 422
