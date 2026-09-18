# Safety Data Sources and Governance

## DataFirst / SAPS Annual Crime Records 2005-2026

Primary nationwide analytical dataset:

- DataFirst catalogue: `https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/1012`
- DOI: `https://doi.org/10.25828/5MAW-4H90`
- Dataset version: **1.4**, dated 14 September 2026
- Producer: South African Police Service
- Distributor: DataFirst, University of Cape Town
- Licence: Creative Commons CC-BY (Attribution-only)
- Geography: South Africa, police-station level
- Coverage: 2005/06 through 2025/26
- File: 24,206 station-year records, 38 variables

Required citation:

> South African Police Service. South African Police Service Annual Crime
> Records 2005-2026 [dataset]. Version 1.4. Pretoria: SAPS [producer], 2026.
> Cape Town: DataFirst [distributor], 2026. DOI:
> https://doi.org/10.25828/5MAW-4H90

## Checked-in 2025/2026 snapshot

For the hackathon demo, the backend includes a derived compressed snapshot:

`backend/data/safety-map-2025-2026.danger-v1.1.json.gz`

It was generated from the validated v1.4 CSV and records:

- source records: **24,206**;
- 2025/2026 station rows: **1,174**;
- mappable stations: **1,128**;
- model: **danger-v1.1**;
- calibrated bands: 544 green, 365 orange, 219 red.

The snapshot is derived CC-BY data and retains the DataFirst/SAPS source ID and
DOI. It contains only the fields needed for the demo API rather than the full
historical microdata.

A configured raw CSV overrides the snapshot only if it matches the official
v1.4 signature. A truncated or older compatible file is reported as
`unverified` and does not replace the verified national snapshot.

## Interpretation

The source contains recorded offence **counts/charges**, not unique incidents,
case dockets, victims, or exact crime locations. One docket can contribute
multiple offence counts.

Station longitude/latitude is a map anchor for an annual station aggregate.
Travel Safe must not present it as the location of the crimes counted.

The historical dataset is not a balanced panel. Station counts change over
time. Search aliases support the 2025/2026 gazetted renames:

- Aberdeen -> Xamdeboo
- Graaff-Reinet -> Robert Sobukwe
- East London -> Kugompo
- Barkly East -> Ekhephinit

## Police-action categories

Drug-related crime, DUI, illegal firearm possession and sexual offences
detected by police action remain visible in common-crime context but do not
drive `danger_score`. Those counts can increase because enforcement activity
increased rather than because underlying victimisation increased.

## Negative values

Some source variables contain negative correction values. The backend clamps
these values to zero **for scoring only** and records a quality flag.

## SafeSuburb

SafeSuburb remains a potential licensed enrichment source for maintained
suburb-to-precinct mapping. Travel Safe must not scrape its compiled commercial
dataset.

## SafetyBrief

SafetyBrief remains a methodology/UX benchmark unless a licensed programmatic
feed is confirmed. Travel Safe does not copy SafetyBrief safety grades.

## Halo separation

Halo is a separate community-place and visitability system. Halo ratings,
likes, and visit evidence never modify DataFirst/SAPS safety scores or risk
bands.

## Privacy and map precision

- Never generate synthetic incident points from station aggregates.
- Never expose victim identity or sensitive narrative through this data layer.
- Never describe station-level counts as suburb/street incident locations.
- Keep source, year, confidence and model caveats visible to the frontend.
