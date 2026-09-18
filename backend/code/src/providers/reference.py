from src.models.safety import AreaStatsResponse, CrimeCategoryStat, DataSource

SOURCES = [
    DataSource(
        id="saps",
        name="South African Police Service quarterly crime statistics",
        status="active",
        role="Canonical factual crime-count source",
        url="https://www.saps.gov.za/services/crimestats.php",
        notes=(
            "Official precinct-level reported-crime aggregates. "
            "Not incident-level coordinates."
        ),
    ),
    DataSource(
        id="safesuburb",
        name="SafeSuburb",
        status="licence_required",
        role="Potential suburb-to-precinct enrichment provider",
        url="https://safesuburb.co.za/data/",
        notes=(
            "Do not scrape into the product. Commercial use of the compiled "
            "mapping/feed requires a licence; self-serve API is not live."
        ),
    ),
    DataSource(
        id="safetybrief",
        name="SafetyBrief",
        status="reference_only",
        role="Methodology and UX benchmark",
        url="https://www.safetybrief.co.za/methodology",
        notes=(
            "Use as a methodology reference unless a licensed programmatic "
            "feed is confirmed."
        ),
    ),
]

WOODSTOCK_REFERENCE = AreaStatsResponse(
    area_code="woodstock",
    area_name="Woodstock Precinct",
    area_type="police_precinct",
    period="Apr 2025-Mar 2026",
    total_reported_crimes=3541,
    previous_period_total=None,
    latest_quarter_total=910,
    latest_quarter_previous_year=800,
    top_categories=[
        CrimeCategoryStat(category="All theft not mentioned elsewhere", count=764),
        CrimeCategoryStat(category="Theft from vehicle", count=549),
        CrimeCategoryStat(category="Drug-related crime", count=434),
        CrimeCategoryStat(category="Commercial crime", count=362),
        CrimeCategoryStat(category="Common robbery", count=251),
    ],
    source_id="saps-reference-via-safesuburb",
    source_url=(
        "https://safesuburb.co.za/western-cape/"
        "city-of-cape-town/woodstock/"
    ),
    data_resolution="whole police precinct; raw reported-crime counts",
    caveats=[
        "Reference fixture for API integration, not a live SafeSuburb feed.",
        "SAPS reports at precinct level, not suburb or street level.",
        "Reported crime excludes incidents that were not reported to police.",
        "Do not infer point-level crime locations from these aggregate counts.",
    ],
)


class ReferenceCrimeProvider:
    def sources(self) -> list[DataSource]:
        return SOURCES

    def area_stats(self, area_code: str) -> AreaStatsResponse | None:
        normalized = area_code.strip().lower().replace("_", "-")
        if normalized in {"woodstock", "woodstock-precinct"}:
            return WOODSTOCK_REFERENCE
        return None
