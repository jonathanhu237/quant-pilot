import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.signal import SymbolSignalSnapshot
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
