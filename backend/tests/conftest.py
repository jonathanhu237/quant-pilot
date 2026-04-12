from collections.abc import AsyncIterator

import pytest_asyncio
import models.trading  # noqa: F401
import models.watchlist  # noqa: F401
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from routers.dashboard import router as dashboard_router
from routers.market import router as market_router
from routers.signals import router as signals_router
from routers.strategy import router as strategy_router
from routers.trading import router as trading_router
from routers.watchlist import router as watchlist_router


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


@pytest_asyncio.fixture
async def app_with_db(db_session: AsyncSession) -> FastAPI:
    app = FastAPI()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(dashboard_router)
    app.include_router(market_router)
    app.include_router(signals_router)
    app.include_router(strategy_router)
    app.include_router(trading_router)
    app.include_router(watchlist_router)
    return app


@pytest_asyncio.fixture
async def client(app_with_db: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app_with_db),
        base_url="http://testserver",
    ) as async_client:
        yield async_client
