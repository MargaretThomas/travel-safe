from src.models.search import AppSearchResponse, AppSearchResult
from src.services.halo_service import HaloService
from src.services.safety_service import SafetyService


class SearchService:
    def __init__(
        self,
        safety_service: SafetyService,
        halo_service: HaloService,
    ) -> None:
        self.safety_service = safety_service
        self.halo_service = halo_service

    def search(
        self,
        query: str,
        *,
        year: str | None = None,
        limit: int = 20,
    ) -> AppSearchResponse:
        needle = query.strip()
        halo_response = self.halo_service.list_halo(query=needle)
        station_response = self.safety_service.search(
            needle,
            year=year,
            limit=limit,
        )
        results: list[AppSearchResult] = []

        for halo in halo_response.items:
            results.append(
                AppSearchResult(
                    result_type="halo",
                    id=halo.id,
                    name=halo.name,
                    latitude=halo.latitude,
                    longitude=halo.longitude,
                    subtitle=halo.location_label,
                    color="#D4AF37",
                    visitability_score=halo.community.visitability_score,
                    rating_average=halo.community.rating_average,
                    rating_count=halo.community.rating_count,
                    caution=halo.caution,
                )
            )

        for station in station_response.results:
            results.append(
                AppSearchResult(
                    result_type="police_station",
                    id=station.id,
                    name=station.name,
                    latitude=station.latitude,
                    longitude=station.longitude,
                    subtitle=station.subtitle,
                    color=station.color,
                    danger_score=station.danger_score,
                    safety_score=station.safety_score,
                    risk_band=station.risk_band,
                    year=station.year,
                    caution=(
                        "Safety context is based on annual police-station "
                        "aggregates, not street-level incident locations."
                    ),
                )
            )

        query_lower = needle.lower()

        def relevance(item: AppSearchResult) -> tuple[int, str, str]:
            name = item.name.lower()
            subtitle = (item.subtitle or "").lower()
            if name == query_lower:
                rank = 0
            elif name.startswith(query_lower):
                rank = 1
            elif query_lower in name:
                rank = 2
            elif query_lower in subtitle:
                rank = 3
            else:
                rank = 4
            return rank, name, item.id

        results.sort(key=relevance)
        capped = results[:limit]
        return AppSearchResponse(
            query=needle,
            results=capped,
            count=len(capped),
        )
