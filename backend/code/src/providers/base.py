from typing import Protocol

from src.models.safety import AreaStatsResponse, DataSource


class CrimeDataProvider(Protocol):
    def sources(self) -> list[DataSource]: ...

    def area_stats(self, area_code: str) -> AreaStatsResponse | None: ...
