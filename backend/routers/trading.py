import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.trading import Account, Position, Trade
from schemas.market import StockQuote
from schemas.trading import (
    AccountResponse,
    PositionResponse,
    TradeActionResponse,
    TradeRequest,
    TradeResponse,
)
from services.quotes import fetch_quote_map

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]
INITIAL_CASH = 100000.0


async def get_or_create_account(db: AsyncSession) -> Account:
    result = await db.execute(select(Account).limit(1))
    account = result.scalar_one_or_none()

    if account is None:
        account = Account(cash_balance=INITIAL_CASH)
        db.add(account)
        await db.commit()
        await db.refresh(account)

    return account


async def load_positions_with_quotes(db: AsyncSession) -> tuple[list[Position], dict[str, dict[str, float | str]]]:
    positions_result = await db.execute(select(Position).order_by(Position.symbol.asc()))
    positions = list(positions_result.scalars().all())
    quotes = await asyncio.to_thread(fetch_quote_map, [position.symbol for position in positions])
    return positions, quotes


def build_position_response(position: Position, quote: StockQuote | None) -> PositionResponse:
    current_price = quote.price if quote else position.average_cost
    market_value = position.shares * current_price
    cost_basis = position.shares * position.average_cost
    unrealized_pnl = market_value - cost_basis
    unrealized_pnl_pct = unrealized_pnl / cost_basis if cost_basis else 0.0

    return PositionResponse(
        symbol=position.symbol,
        name=quote.name if quote else position.symbol,
        shares=position.shares,
        average_cost=position.average_cost,
        current_price=current_price,
        market_value=market_value,
        unrealized_pnl=unrealized_pnl,
        unrealized_pnl_pct=unrealized_pnl_pct,
    )


async def build_account_response(db: AsyncSession) -> AccountResponse:
    account = await get_or_create_account(db)
    positions, quotes = await load_positions_with_quotes(db)
    position_responses = [
        build_position_response(position, quotes.get(position.symbol)) for position in positions
    ]

    market_value = sum(position.market_value for position in position_responses)
    total_assets = account.cash_balance + market_value
    total_pnl = total_assets - INITIAL_CASH
    total_return_rate = total_pnl / INITIAL_CASH

    return AccountResponse(
        cash_balance=account.cash_balance,
        market_value=market_value,
        total_assets=total_assets,
        total_pnl=total_pnl,
        total_return_rate=total_return_rate,
        positions=position_responses,
    )


async def execute_trade(
    db: AsyncSession,
    payload: TradeRequest,
    side: Literal["buy", "sell"],
) -> TradeActionResponse:
    account = await get_or_create_account(db)
    quotes = await asyncio.to_thread(fetch_quote_map, [payload.symbol])
    quote = quotes.get(payload.symbol)

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live quote not available for the selected symbol",
        )

    price = quote.price
    trade_value = price * payload.shares

    position_result = await db.execute(select(Position).where(Position.symbol == payload.symbol))
    position = position_result.scalar_one_or_none()

    if side == "buy":
        if account.cash_balance < trade_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient cash balance",
            )

        account.cash_balance -= trade_value
        if position is None:
            position = Position(
                symbol=payload.symbol,
                shares=payload.shares,
                average_cost=price,
            )
            db.add(position)
        else:
            total_shares = position.shares + payload.shares
            total_cost = (position.average_cost * position.shares) + trade_value
            position.shares = total_shares
            position.average_cost = total_cost / total_shares
    else:
        if position is None or position.shares < payload.shares:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient position size",
            )

        account.cash_balance += trade_value
        remaining_shares = position.shares - payload.shares
        if remaining_shares == 0:
            await db.delete(position)
        else:
            position.shares = remaining_shares

    trade = Trade(
        side=side,
        symbol=payload.symbol,
        shares=payload.shares,
        price=price,
    )
    db.add(trade)

    await db.commit()
    await db.refresh(account)

    return TradeActionResponse(
        side=side,
        symbol=payload.symbol,
        shares=payload.shares,
        price=price,
        cash_balance=account.cash_balance,
    )


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
