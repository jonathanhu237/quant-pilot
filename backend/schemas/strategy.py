from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class StrategyParameterDefinition(BaseModel):
    name: str
    type: Literal["integer", "float"]
    default: float | int
    min: float | int | None = None
    max: float | int | None = None
    step: float | int | None = None


class StrategyMeta(BaseModel):
    id: str
    name: str
    description: str
    parameters: list[StrategyParameterDefinition]


class BacktestRequest(BaseModel):
    strategy_id: str
    symbol: str
    start_date: date
    end_date: date
    params: dict[str, float | int] = Field(default_factory=dict)

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) != 6 or not normalized.isdigit():
            raise ValueError("Symbol must be a 6-digit A-share stock code")
        return normalized

    @model_validator(mode="after")
    def validate_dates(self) -> "BacktestRequest":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class EquityPoint(BaseModel):
    date: date
    value: float


class BacktestResult(BaseModel):
    strategy_id: str
    symbol: str
    annual_return: float
    max_drawdown: float
    win_rate: float
    sharpe_ratio: float
    total_trades: int
    equity_curve: list[EquityPoint]
