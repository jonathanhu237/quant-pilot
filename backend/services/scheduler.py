from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI

from database import AsyncSessionLocal
from services.signal_history import snapshot_watchlist_signals

_scheduler: AsyncIOScheduler | None = None


async def _snapshot_signals_job() -> None:
    async with AsyncSessionLocal() as db:
        await snapshot_watchlist_signals(db)


def start_scheduler(app: FastAPI | None = None) -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return

    scheduler = AsyncIOScheduler(timezone=ZoneInfo("Asia/Shanghai"))
    scheduler.add_job(
        _snapshot_signals_job,
        trigger="cron",
        day_of_week="mon-fri",
        hour=15,
        minute=30,
        id="signal_history_snapshot",
        replace_existing=True,
    )
    scheduler.start()
    if app is not None:
        app.state.signal_history_scheduler = scheduler
    _scheduler = scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return

    _scheduler.shutdown(wait=False)
    _scheduler = None
