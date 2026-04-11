from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.watchlist import Watchlist
from schemas.watchlist import WatchlistCreate, WatchlistResponse

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[WatchlistResponse])
async def list_watchlist(db: DbSession) -> list[Watchlist]:
    result = await db.execute(select(Watchlist).order_by(Watchlist.created_at.desc()))
    return list(result.scalars().all())


@router.post("/", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist_item(payload: WatchlistCreate, db: DbSession) -> Watchlist:
    item = Watchlist(symbol=payload.symbol.upper())
    db.add(item)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symbol already exists in watchlist",
        ) from exc

    await db.refresh(item)
    return item


@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist_item(symbol: str, db: DbSession) -> None:
    normalized_symbol = symbol.upper()
    result = await db.execute(select(Watchlist).where(Watchlist.symbol == normalized_symbol))
    item = result.scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symbol not found in watchlist",
        )

    await db.delete(item)
    await db.commit()
