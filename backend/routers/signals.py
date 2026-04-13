import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.signal import SymbolSignalSnapshot
from schemas.signal_history import SignalHistoryEntry
from services.signal_history import get_signal_history, snapshot_watchlist_signals
from services.signals import generate_watchlist_signals

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/signals", tags=["signals"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/watchlist", response_model=list[SymbolSignalSnapshot])
async def list_watchlist_signals(db: DbSession) -> list[SymbolSignalSnapshot]:
    try:
        return await generate_watchlist_signals(db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to generate watchlist signals")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch strategy signals from upstream data source",
        ) from exc


def _validate_symbol(symbol: str) -> str:
    normalized = symbol.strip()
    if len(normalized) != 6 or not normalized.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symbol must be a 6-digit numeric code",
        )
    return normalized


def _validate_days(days: int) -> int:
    if days < 1 or days > 180:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="days must be between 1 and 180",
        )
    return days


@router.post("/snapshot")
async def snapshot_signals(db: DbSession) -> dict[str, int]:
    try:
        inserted = await snapshot_watchlist_signals(db)
        return {"inserted": inserted}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to snapshot strategy signals")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to persist strategy signals",
        ) from exc


@router.get("/history/{symbol}", response_model=list[SignalHistoryEntry])
async def get_history(
    symbol: str,
    db: DbSession,
    days: int = Query(default=30),
) -> list[SignalHistoryEntry]:
    try:
        normalized_symbol = _validate_symbol(symbol)
        normalized_days = _validate_days(days)
        return await get_signal_history(db, normalized_symbol, normalized_days)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to load signal history for symbol %s", symbol)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to load signal history",
        ) from exc
