from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class SignalHistory(Base):
    __tablename__ = "signal_history"
    __table_args__ = (
        UniqueConstraint("symbol", "strategy_id", "signal_date", name="uq_signal_history_symbol_strategy_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    strategy_id: Mapped[str] = mapped_column(String(50), nullable=False)
    signal: Mapped[str] = mapped_column(String(10), nullable=False)
    signal_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


Index("ix_signal_history_symbol_signal_date_desc", SignalHistory.symbol, SignalHistory.signal_date.desc())
