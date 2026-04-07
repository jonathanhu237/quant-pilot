from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TradeRequest(BaseModel):
    symbol: str
    shares: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) != 6 or not normalized.isdigit():
            raise ValueError("Symbol must be a 6-digit A-share stock code")
        return normalized


class PositionResponse(BaseModel):
    symbol: str
    name: str
    shares: int
    average_cost: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float


class AccountResponse(BaseModel):
    cash_balance: float
    market_value: float
    total_assets: float
    total_pnl: float
    total_return_rate: float
    positions: list[PositionResponse]


class TradeResponse(BaseModel):
    id: int
    side: Literal["buy", "sell"]
    symbol: str
    shares: int
    price: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TradeActionResponse(BaseModel):
    side: Literal["buy", "sell"]
    symbol: str
    shares: int
    price: float
    cash_balance: float
