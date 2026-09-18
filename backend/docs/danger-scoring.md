# Danger Scoring Model

## Purpose

Travel Safe converts annual SAPS police-station records into a transparent relative danger signal for map visualisation. The model is designed for route/planning context, not to declare that a person will or will not be safe at a location.

The input dataset has annual offence counts at police-station level. It does not include station-population denominators or incident-level coordinates. The score is therefore a **same-year relative burden score**, not a per-capita crime rate.

## Formula

For every financial year and every scoring crime category:

1. Negative correction values are clamped to zero for scoring and retained as a quality flag.
2. Each station's count is converted to an empirical percentile against all stations in that same financial year.
3. Each category percentile is multiplied by a severity weight.
4. The weighted percentiles are averaged and multiplied by 100.

`danger_score = 100 * sum(weight_i * percentile_i) / sum(weight_i)`

`safety_score = 100 - danger_score`

This produces a 0-100 comparative index while avoiding raw-count scale differences between offence categories.

## Severity weights

| Crime field | Weight |
|---|---:|
| Murder | 1.00 |
| Attempted murder | 0.90 |
| Rape | 0.90 |
| Kidnapping | 0.85 |
| Sexual assault | 0.80 |
| Aggravated robbery | 0.80 |
| Attempted sexual offences | 0.75 |
| Assault GBH | 0.75 |
| Common robbery | 0.55 |
| Common assault | 0.45 |
| Arson | 0.45 |
| Residential burglary | 0.35 |
| Non-residential burglary | 0.25 |
| Motor vehicle theft | 0.25 |
| Theft from vehicles | 0.15 |
| Malicious damage to property | 0.15 |
| Commercial crime | 0.10 |
| Other theft | 0.08 |
| Shoplifting | 0.05 |
| Stock theft | 0.05 |

Weights are product-model parameters, not official SAPS severity ratings. They must remain versioned and reviewable.

## Double-count prevention

Aggravated robbery already contains important subtypes. The following are shown to users when they are common locally, but are excluded from the score so they are not counted twice:

- carjacking;
- truck hijacking;
- bank robbery;
- cash-in-transit robbery;
- robbery at residential premises;
- robbery at non-residential premises.

Broad sexual-offence aggregate fields are also excluded where specific component fields are already being scored.

## Police-action offences

The following fields are visible in `top_crimes` but do **not** increase the danger score:

- drug-related crime;
- driving under the influence;
- illegal possession of firearms;
- sexual offences detected by police action.

These categories are strongly influenced by enforcement activity, so higher counts can reflect intensified policing rather than higher underlying victimisation.

## Map bands

| Band | Score | Colour | Meaning |
|---|---:|---|---|
| Green | 0-39.99 | `#22C55E` | Lower relative danger burden for that year |
| Orange | 40-69.99 | `#F97316` | Elevated relative danger burden |
| Red | 70-100 | `#EF4444` | High relative danger burden |
| Gold | n/a | `#D4AF37` | Curated local known spot; not a crime grade |

## Confidence and data quality

The score confidence starts below 1.0 because the model is not population-normalised. Confidence is reduced when municipality/district metadata is missing, when negative correction values appear, or when a station is known to represent only a partial year.

Stations without coordinates remain available to statistics/search logic where appropriate but cannot be plotted as heat-map anchors.

## Interpretation rules

- A red station is high **relative to other police stations in the same financial year**.
- A green station is not a promise of personal safety.
- The station coordinate is a map anchor for an annual police-station aggregate; it is not the location of the crimes counted.
- `top_crimes` describes the largest recorded categories for the station/year and separately identifies whether a category contributes to the danger score.
- The algorithm should be recalibrated if reliable station-level population denominators become available.

## Model version

Initial algorithm version: `danger-v1`.
