import asyncio

import akshare as ak
from fastapi import APIRouter, HTTPException, Query, status

from schemas.market import StockQuote

router = APIRouter()


def fetch_quotes(symbols: list[str]) -> list[StockQuote]:
    normalized_symbols = {symbol.strip() for symbol in symbols if symbol.strip()}
    if not normalized_symbols:
        return []

    spot = ak.stock_zh_a_spot_em()
    filtered = spot[spot["代码"].isin(normalized_symbols)]

    quotes: list[StockQuote] = []
    for _, row in filtered.iterrows():
        quotes.append(
            StockQuote(
                symbol=str(row["代码"]),
                name=str(row["名称"]),
                price=float(row["最新价"]),
                change_pct=float(row["涨跌幅"]),
                change_amount=float(row["涨跌额"]),
            )
        )

    return quotes


@router.get("/quotes", response_model=list[StockQuote])
async def get_market_quotes(symbols: str = Query("")) -> list[StockQuote]:
    requested_symbols = [symbol for symbol in symbols.split(",") if symbol.strip()]
    try:
        return await asyncio.to_thread(fetch_quotes, requested_symbols)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch market quotes from upstream data source",
        ) from exc
