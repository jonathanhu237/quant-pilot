import inspect

from main import health_check
from routers.dashboard import router as dashboard_router
from routers.market import router as market_router
from routers.strategy import list_strategies, router as strategy_router
from routers.trading import router as trading_router
from routers.watchlist import router as watchlist_router


def test_each_router_defines_its_own_prefix_and_tags() -> None:
    assert dashboard_router.prefix == "/api/dashboard"
    assert dashboard_router.tags == ["dashboard"]

    assert market_router.prefix == "/api/market"
    assert market_router.tags == ["market"]

    assert strategy_router.prefix == "/api/strategy"
    assert strategy_router.tags == ["strategy"]

    assert trading_router.prefix == "/api/trading"
    assert trading_router.tags == ["trading"]

    assert watchlist_router.prefix == "/api/watchlist"
    assert watchlist_router.tags == ["watchlist"]


def test_health_and_strategy_listing_are_sync_path_operations() -> None:
    assert not inspect.iscoroutinefunction(health_check)
    assert not inspect.iscoroutinefunction(list_strategies)
