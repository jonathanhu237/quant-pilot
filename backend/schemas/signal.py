from typing import Literal

from pydantic import BaseModel


class StrategySignalSnapshot(BaseModel):
    strategy_id: str
    strategy_name: str
    signal: Literal["buy", "sell", "hold"]
    signal_date: str


class SymbolSignalSnapshot(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float
    signals: list[StrategySignalSnapshot]
