from bisect import bisect_left

RISK_COLORS = {
    "green": "#22C55E",
    "orange": "#F97316",
    "red": "#EF4444",
    "gold": "#D4AF37",
}

CATEGORY_LABELS = {
    "other_theft": "Other theft",
    "arson": "Arson",
    "assault_gbh": "Assault GBH",
    "attempted_murder": "Attempted murder",
    "attempted_sexoff": "Attempted sexual offences",
    "bank_robbery": "Bank robbery",
    "burglary_nonres": "Burglary at non-residential premises",
    "burglary_res": "Burglary at residential premises",
    "carjacking": "Carjacking",
    "commercial_crime": "Commercial crime",
    "common_assault": "Common assault",
    "common_robbery": "Common robbery",
    "contact_sexoff": "Contact sexual offences",
    "dui": "Driving under the influence",
    "drug_crime": "Drug-related crime",
    "illegal_firearms": "Illegal possession of firearms",
    "kidnapping": "Kidnapping",
    "malicious_damage": "Malicious damage to property",
    "murder": "Murder",
    "rape": "Rape",
    "robbery_nonres": "Robbery at non-residential premises",
    "robbery_res": "Robbery at residential premises",
    "cash_transit_robbery": "Cash-in-transit robbery",
    "aggr_robbery": "Aggravated robbery",
    "sexual_assault": "Sexual assault",
    "sexual_offences": "Other sexual offences",
    "police_detected_sexoff": "Sexual offences detected by police",
    "shoplifting": "Shoplifting",
    "stock_theft": "Stock theft",
    "vehicle_theft": "Motor vehicle theft",
    "theft_from_vehicle": "Theft from vehicles",
    "truck_hijacking": "Truck hijacking",
}

# Deliberately excludes aggravated-robbery subtypes from the score because
# they are already contained in aggr_robbery. Police-action offences are
# displayed to users but do not drive the danger score.
DANGER_WEIGHTS = {
    "murder": 1.00,
    "attempted_murder": 0.90,
    "rape": 0.90,
    "sexual_assault": 0.80,
    "attempted_sexoff": 0.75,
    "kidnapping": 0.85,
    "assault_gbh": 0.75,
    "aggr_robbery": 0.80,
    "common_robbery": 0.55,
    "common_assault": 0.45,
    "arson": 0.45,
    "burglary_res": 0.35,
    "burglary_nonres": 0.25,
    "vehicle_theft": 0.25,
    "theft_from_vehicle": 0.15,
    "malicious_damage": 0.15,
    "commercial_crime": 0.10,
    "other_theft": 0.08,
    "shoplifting": 0.05,
    "stock_theft": 0.05,
}

POLICE_ACTION_FIELDS = {
    "dui",
    "drug_crime",
    "illegal_firearms",
    "police_detected_sexoff",
}

OVERLAP_EXCLUDED_FIELDS = {
    "bank_robbery",
    "carjacking",
    "robbery_nonres",
    "robbery_res",
    "cash_transit_robbery",
    "truck_hijacking",
    "contact_sexoff",
    "sexual_offences",
}


def sanitize_count(value: float | None) -> int:
    if value is None:
        return 0
    return max(0, int(value))


def percentile_rank(sorted_values: list[int], value: int) -> float:
    if len(sorted_values) < 2 or sorted_values[0] == sorted_values[-1]:
        return 0.0
    lower_count = bisect_left(sorted_values, value)
    return lower_count / (len(sorted_values) - 1)


def danger_score(
    counts: dict[str, int],
    distributions: dict[str, list[int]],
) -> float:
    weighted = 0.0
    total_weight = 0.0
    for field, weight in DANGER_WEIGHTS.items():
        values = distributions.get(field, [])
        if len(values) < 2 or values[0] == values[-1]:
            continue
        pct = percentile_rank(values, sanitize_count(counts.get(field)))
        weighted += pct * weight
        total_weight += weight
    if total_weight == 0:
        return 0.0
    return round((weighted / total_weight) * 100, 2)


def risk_band(score: float) -> str:
    if score < 40:
        return "green"
    if score < 70:
        return "orange"
    return "red"


def risk_color(score: float) -> str:
    return RISK_COLORS[risk_band(score)]
