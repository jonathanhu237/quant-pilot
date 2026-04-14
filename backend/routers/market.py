import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, status

from schemas.market import KlineRange, KlineResponse, StockQuote
from services.market_history import get_market_history
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


@router.get("/{symbol}/kline", response_model=KlineResponse)
async def get_market_kline(
    symbol: Annotated[str, Path(pattern=r"^\d{6}$")],
    range: KlineRange = Query(default="1M"),
) -> KlineResponse:
    try:
        return await asyncio.to_thread(get_market_history, symbol, range)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch market kline data from upstream data source",
        ) from exc
