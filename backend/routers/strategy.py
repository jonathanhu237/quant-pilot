import asyncio
import logging

from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger(__name__)

from schemas.strategy import BacktestRequest, BacktestResult, StrategyMeta
from services.backtest import list_strategy_metadata, run_backtest

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("/", response_model=list[StrategyMeta])
def list_strategies() -> list[StrategyMeta]:
    return list_strategy_metadata()


@router.post("/backtest", response_model=BacktestResult)
async def execute_backtest(payload: BacktestRequest) -> BacktestResult:
    try:
        return await asyncio.to_thread(run_backtest, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Backtest failed for payload %s", payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch strategy backtest data from upstream data source",
        ) from exc
