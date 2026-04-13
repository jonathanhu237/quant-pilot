from pydantic import BaseModel, ConfigDict

from typing import Literal


class SignalHistoryEntry(BaseModel):
    symbol: str
    strategy_id: str
    strategy_name: str
    signal: Literal["buy", "sell", "hold"]
    signal_date: str

    model_config = ConfigDict(from_attributes=True)
