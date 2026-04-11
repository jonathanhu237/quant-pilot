from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import models.trading  # noqa: F401
from database import Base, get_db
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


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    await engine.dispose()


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
