import asyncio

from fastapi import APIRouter, HTTPException, status

from schemas.strategy import BacktestRequest, BacktestResult, StrategyMeta
from services.backtest import list_strategy_metadata, run_backtest

router = APIRouter()


@router.get("/", response_model=list[StrategyMeta])
async def list_strategies() -> list[StrategyMeta]:
    return list_strategy_metadata()


@router.post("/backtest", response_model=BacktestResult)
async def execute_backtest(payload: BacktestRequest) -> BacktestResult:
    try:
        return await asyncio.to_thread(run_backtest, payload)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch strategy backtest data from upstream data source",
        ) from exc
