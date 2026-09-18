# Safety Data Sources and Governance

## DataFirst / SAPS Annual Crime Records 2005-2026

Primary nationwide analytical dataset:

- DataFirst catalogue: `https://www.datafirst.uct.ac.za/dataportal/index.php/catalog/1012`
- DOI: `https://doi.org/10.25828/5MAW-4H90`
- Dataset version: **1.4**, dated 14 September 2026
- Producer: South African Police Service
- Distributor / metadata producer: DataFirst, University of Cape Town
- Licence: Creative Commons CC-BY (Attribution-only)
- Geography: South Africa, police-station level
- Coverage: 2005/06 through 2025/26 financial years
- File: 24,206 station-year records, 38 variables

Required citation:

> South African Police Service. South African Police Service Annual Crime Records 2005-2026 [dataset]. Version 1.4. Pretoria: South African Police Service (SAPS) [producer], 2026. Cape Town: DataFirst [distributor], 2026. DOI: https://doi.org/10.25828/5MAW-4H90

The catalogue metadata is public, but DataFirst requires a free account/login to download the microdata.

## Installing the national file

1. Log in to DataFirst and download the Version 1.4 microdata in CSV form.
2. Save it locally as `backend/data/sapacr-2005-2026-v1_4.csv`.
3. Alternatively set `SAPS_CRIME_CSV_PATH` to an absolute CSV path.
4. Start the FastAPI backend.
5. Check `GET /api/v1/dataset/status`.

A successful national load should report the latest year, loaded record count, mappable station count and `nationwide_ready=true` once national station coverage is present.

## Data interpretation

The dataset contains recorded offence **counts/charges**, not unique incidents, case dockets, victims or exact crime locations. A single docket can contain several offences and therefore several recorded counts.

The station longitude/latitude is used only as the geographic anchor for the station's annual aggregate. Travel Safe must never display it as if every crime occurred at the police-station coordinate.

The dataset is not a balanced historical panel. Station counts change over time, and 2025/26 contains two new partial-year stations. The backend marks these rows with lower confidence.

Version 1.4 also records four stations under new gazetted names in 2025/26. Search aliases are supported:

- Aberdeen -> Xamdeboo
- Graaff-Reinet -> Robert Sobukwe
- East London -> Kugompo
- Barkly East -> Ekhephinit

## Police-action categories

Drug-related crime, DUI, illegal firearm possession and sexual offences detected by police action remain visible to users but do not drive the danger score. Counts in these categories can rise because policing activity intensified rather than because underlying victimisation rose.

## Negative values

Some offence variables contain negative correction values in the source. The backend clamps these values to zero **for scoring only** and adds a quality flag. It does not silently reinterpret the source record as a negative number of crimes.

## SafeSuburb

SafeSuburb remains a potential licensed enrichment source for maintained suburb-to-precinct mapping. Travel Safe must not scrape its compiled commercial dataset. Its public methodology and individual pages may be used for manual verification/reference, subject to its terms.

## SafetyBrief

SafetyBrief remains a methodology/UX benchmark unless a licensed programmatic data feed is confirmed. Travel Safe does not copy SafetyBrief safety grades into the product.

## Golden spots

Golden spots are a separate curated layer and are never inferred from crime statistics.

A golden spot can represent a locally recognised public landmark, meeting point, transport landmark, community facility or other place the team has chosen to surface. Every production entry should include a source label and verification state.

Gold means **known/curated place**, not "safe place". The API always returns this caveat with golden spots.

Production golden spots are read from `backend/data/golden-spots.json` or `GOLDEN_SPOTS_JSON_PATH`. The repository contains only an empty schema example; real entries should be reviewed before publishing.

## Privacy and map precision

- Do not generate synthetic incident points from annual station aggregates.
- Do not expose victim identity or sensitive narrative through this dataset layer.
- Do not describe station-level annual counts as suburb-level incident locations.
- Keep source, period, confidence and model caveats visible to the frontend.
