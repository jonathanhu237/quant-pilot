from abc import ABC, abstractmethod
from typing import ClassVar

import pandas as pd

from schemas.strategy import StrategyMeta, StrategyParameterDefinition


class BaseStrategy(ABC):
    strategy_id: ClassVar[str]
    name: ClassVar[str]
    description: ClassVar[str]
    parameters: ClassVar[list[StrategyParameterDefinition]]

    def __init__(self, params: dict[str, float | int] | None = None):
        provided_params = params or {}
        defaults = {definition.name: definition.default for definition in self.parameters}
        self.params = {**defaults, **provided_params}

    @classmethod
    def metadata(cls) -> StrategyMeta:
        return StrategyMeta(
            id=cls.strategy_id,
            name=cls.name,
            description=cls.description,
            parameters=cls.parameters,
        )

    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """Return action signals aligned with `data` index: 1 buy, -1 sell, 0 hold."""
