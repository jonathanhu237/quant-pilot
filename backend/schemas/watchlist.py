from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WatchlistCreate(BaseModel):
    symbol: str


class WatchlistResponse(BaseModel):
    id: int
    symbol: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
