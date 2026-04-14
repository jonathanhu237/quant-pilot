from typing import Literal

from pydantic import BaseModel

KlineRange = Literal["1M", "3M", "6M", "1Y", "ALL"]


class StockQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float
    change_amount: float


class KlineBar(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class KlineBasicInfo(BaseModel):
    prev_close: float | None = None
    open: float | None = None
    high: float | None = None
    low: float | None = None


class KlineResponse(BaseModel):
    symbol: str
    name: str
    range: KlineRange
    bars: list[KlineBar]
    ma5: list[float | None]
    ma20: list[float | None]
    ma60: list[float | None]
    rsi14: list[float | None]
    basic_info: KlineBasicInfo
