from pydantic import BaseModel


class StockQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float
    change_amount: float
