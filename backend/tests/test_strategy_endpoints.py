from datetime import date

import pytest
from httpx import AsyncClient

from routers import strategy as strategy_router
from schemas.strategy import BacktestResult


pytestmark = pytest.mark.asyncio


def make_backtest_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "strategy_id": "dual_ma",
        "symbol": "600519",
        "start_date": date(2024, 1, 1).isoformat(),
        "end_date": date(2024, 1, 5).isoformat(),
        "params": {
            "short_window": 2,
            "long_window": 3,
        },
    }
    payload.update(overrides)
    return payload


async def test_list_strategies_returns_registered_metadata(client: AsyncClient) -> None:
    response = await client.get("/api/strategy/")

    assert response.status_code == 200

    payload = response.json()
    assert len(payload) == 2
    assert {strategy["id"] for strategy in payload} == {"dual_ma", "rsi"}
    assert all({"id", "name", "description", "parameters"} <= strategy.keys() for strategy in payload)


async def test_list_strategies_exposes_dual_ma_parameters(client: AsyncClient) -> None:
    response = await client.get("/api/strategy/")

    assert response.status_code == 200

    payload = response.json()
    dual_ma = next(strategy for strategy in payload if strategy["id"] == "dual_ma")

    assert dual_ma["parameters"] == [
        {
            "name": "short_window",
            "type": "integer",
            "default": 10,
            "min": 2,
            "max": 120,
            "step": 1,
        },
        {
            "name": "long_window",
            "type": "integer",
            "default": 30,
            "min": 5,
            "max": 250,
            "step": 1,
        },
    ]


async def test_backtest_endpoint_returns_mocked_result(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expected = BacktestResult(
        strategy_id="dual_ma",
        symbol="600519",
        annual_return=0.12,
        max_drawdown=-0.08,
        win_rate=0.55,
        sharpe_ratio=1.42,
        total_trades=7,
    )
    monkeypatch.setattr(strategy_router, "run_backtest", lambda _payload: expected)

    response = await client.post(
        "/api/strategy/backtest",
        json=make_backtest_payload(),
    )

    assert response.status_code == 200
    assert response.json() == expected.model_dump()


async def test_backtest_endpoint_maps_value_error_to_400(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_value_error(_payload: object) -> BacktestResult:
        raise ValueError("Invalid strategy parameters")

    monkeypatch.setattr(strategy_router, "run_backtest", raise_value_error)

    response = await client.post(
        "/api/strategy/backtest",
        json=make_backtest_payload(),
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid strategy parameters"}


async def test_backtest_endpoint_maps_unexpected_error_to_502(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_runtime_error(_payload: object) -> BacktestResult:
        raise RuntimeError("upstream failed")

    monkeypatch.setattr(strategy_router, "run_backtest", raise_runtime_error)

    response = await client.post(
        "/api/strategy/backtest",
        json=make_backtest_payload(),
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Failed to fetch strategy backtest data from upstream data source"
    }


async def test_backtest_endpoint_rejects_invalid_symbol(client: AsyncClient) -> None:
    response = await client.post(
        "/api/strategy/backtest",
        json=make_backtest_payload(symbol="AAPL"),
    )

    assert response.status_code == 422


async def test_backtest_endpoint_rejects_end_date_before_start_date(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/strategy/backtest",
        json=make_backtest_payload(
            start_date=date(2024, 1, 5).isoformat(),
            end_date=date(2024, 1, 1).isoformat(),
        ),
    )

    assert response.status_code == 422
