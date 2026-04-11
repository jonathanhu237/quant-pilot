import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from schemas.market import StockQuote
from services.quotes import fetch_quotes

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/quotes", response_model=list[StockQuote])
async def get_market_quotes(symbols: Annotated[str, Query()] = "") -> list[StockQuote]:
    requested_symbols = [symbol for symbol in symbols.split(",") if symbol.strip()]
    try:
        return await asyncio.to_thread(fetch_quotes, requested_symbols)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch market quotes from upstream data source",
        ) from exc
