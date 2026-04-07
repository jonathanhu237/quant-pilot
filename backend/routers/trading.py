from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.trading import Trade
from schemas.trading import (
    AccountResponse,
    TradeActionResponse,
    TradeRequest,
    TradeResponse,
)
from services.trading import build_account_response, execute_trade

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/account", response_model=AccountResponse)
async def get_account(db: DbSession) -> AccountResponse:
    return await build_account_response(db)


@router.post("/buy", response_model=TradeActionResponse)
async def buy_stock(payload: TradeRequest, db: DbSession) -> TradeActionResponse:
    return await execute_trade(db, payload, "buy")


@router.post("/sell", response_model=TradeActionResponse)
async def sell_stock(payload: TradeRequest, db: DbSession) -> TradeActionResponse:
    return await execute_trade(db, payload, "sell")


@router.get("/history", response_model=list[TradeResponse])
async def get_trade_history(db: DbSession) -> list[Trade]:
    result = await db.execute(select(Trade).order_by(Trade.created_at.desc(), Trade.id.desc()))
    return list(result.scalars().all())
