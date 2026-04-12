from contextlib import asynccontextmanager

import models.trading  # noqa: F401
import models.watchlist  # noqa: F401
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers.dashboard import router as dashboard_router
from routers.market import router as market_router
from routers.signals import router as signals_router
from routers.strategy import router as strategy_router
from routers.trading import router as trading_router
from routers.watchlist import router as watchlist_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Quant Pilot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)
app.include_router(market_router)
app.include_router(signals_router)
app.include_router(strategy_router)
app.include_router(trading_router)
app.include_router(watchlist_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
