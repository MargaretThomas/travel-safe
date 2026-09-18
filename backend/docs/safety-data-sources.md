# Safety Data Sources and Governance

## Principle

Travel Safe must distinguish factual crime statistics from derived safety signals. Every API response should make its data resolution, provenance and limitations visible.

## SAPS

Primary factual source:

- https://www.saps.gov.za/services/crimestats.php

SAPS quarterly crime statistics are reported at police-station / precinct level. They are not exact suburb-level or street-level incident coordinates.

Rules:
- keep the original period and category names;
- preserve source URLs and ingestion timestamps once automated ingestion exists;
- do not generate random incident points inside a precinct;
- do not imply reported-crime totals capture unreported crime.

## SafeSuburb

References:
- https://safesuburb.co.za/data/
- https://safesuburb.co.za/methodology/
- https://safesuburb.co.za/western-cape/city-of-cape-town/woodstock/

SafeSuburb publishes official SAPS counts in a more usable suburb/precinct experience. Its commercial value is the maintained suburb-to-precinct mapping, cleaned dataset and confidence/provenance grades.

Integration rule:
- do not scrape SafeSuburb into the product;
- commercial use of its compiled dataset should use a licence/structured feed;
- its self-serve API is not currently live;
- the review branch uses one manually referenced Woodstock page only as a deterministic integration fixture.

The fixture must be replaced by an agreed live ingestion/provider before production use.

## SafetyBrief

References:
- https://www.safetybrief.co.za/map
- https://www.safetybrief.co.za/methodology

Use SafetyBrief as a methodology and UX benchmark unless the team obtains a licensed programmatic feed. Do not silently copy its safety grades into Travel Safe.

## Safety scoring

The endpoint exists now, but the MVP deliberately returns `insufficient_data` rather than pseudo-precision.

Before producing a numeric Travel Safe score, the backend team should agree:
1. peer groups for comparison;
2. denominator quality and population source;
3. trend window;
4. category weighting;
5. confidence degradation for incomplete/stale data;
6. validation against known edge cases.

A score must be presented as a planning signal, not a guarantee of personal safety.
