import type { Halo } from '@/lib/api/halo';
import type { HeatmapCell, RiskBand } from '@/lib/api/trips';
import type { SafetyZone } from '@/lib/safety-map';

export type ScoreInsightKind = 'official_safety' | 'demo_safety' | 'halo';

export type ScoreInsight = {
  id: string;
  kind: ScoreInsightKind;
  title: string;
  locationLabel: string;
  score: number | null;
  scoreLabel: string;
  bandLabel: string;
  bandColor: string;
  confidence: number | null;
  confidenceLabel: string;
  meaning: string;
  why: string[];
  recommendation: string;
  methodology: string;
  sourceLabel: string;
  notes: string[];
};

const BAND_COLORS: Record<RiskBand, string> = {
  green: '#22C55E',
  orange: '#F97316',
  red: '#EF4444',
};

function roundScore(value: number): number {
  return Math.round(value);
}

export function confidenceLabel(
  confidence: number | null,
  evidenceType: 'data' | 'community' = 'data',
): string {
  if (confidence == null) return 'Confidence not available';
  const pct = Math.round(confidence * 100);
  const label =
    evidenceType === 'community' ? 'community evidence' : 'data quality';
  if (confidence >= 0.8) return 'High ' + label + ' · ' + pct + '%';
  if (confidence >= 0.5) return 'Moderate ' + label + ' · ' + pct + '%';
  return 'Limited ' + label + ' · ' + pct + '%';
}

function safetyBandLabel(band: RiskBand | null | undefined): string {
  if (band === 'green') return 'Lower relative danger burden';
  if (band === 'orange') return 'Elevated relative danger burden';
  if (band === 'red') return 'High relative danger burden';
  return 'Risk band unavailable';
}

function safetyRecommendation(
  band: RiskBand | null | undefined,
  confidence: number | null,
): string {
  const confidenceNote =
    confidence != null && confidence < 0.5
      ? ' Evidence quality is limited, so treat this recommendation cautiously.'
      : '';
  if (band === 'green') {
    return (
      'This area has a lower comparative burden in the current dataset. Use normal travel precautions and still consider time of day, route visibility and current conditions.' +
      confidenceNote
    );
  }
  if (band === 'orange') {
    return (
      'The data shows an elevated comparative burden. Prefer busy, well-lit routes, keep a trusted contact informed and consider an alternative route when travelling alone or after dark.' +
      confidenceNote
    );
  }
  if (band === 'red') {
    return (
      'The data shows a high comparative burden. Consider another route or transport option, avoid isolated walking stretches and keep emergency/trusted-contact features ready.' +
      confidenceNote
    );
  }
  return (
    'There is not enough scored evidence to make a risk-band recommendation. Review the available data and use normal travel precautions.' +
    confidenceNote
  );
}

function humanizeQualityFlag(flag: string): string {
  const labels: Record<string, string> = {
    negative_adjustments_present:
      'The source contains negative adjustment values for one or more categories.',
    local_municipality_missing: 'Local municipality metadata is missing.',
    district_municipality_missing: 'District municipality metadata is missing.',
    partial_year_station: 'This police-station record is flagged as partial-year data.',
  };
  return labels[flag] ?? flag.replaceAll('_', ' ');
}

export function buildSafetyInsight(cell: HeatmapCell): ScoreInsight {
  const safetyScore =
    typeof cell.safety_score === 'number'
      ? cell.safety_score
      : 100 - cell.relative_intensity * 100;
  const dangerScore =
    typeof cell.danger_score === 'number'
      ? cell.danger_score
      : cell.relative_intensity * 100;
  const confidence =
    typeof cell.confidence === 'number' ? cell.confidence : null;
  const band = cell.risk_band ?? null;
  const contributing = (cell.top_crimes ?? [])
    .filter((item) => item.counts_toward_danger_score)
    .slice(0, 4)
    .map((item) => {
      const weight =
        typeof item.danger_weight === 'number'
          ? ' · severity weight ' + item.danger_weight.toFixed(2)
          : '';
      return (
        item.label +
        ': ' +
        item.count.toLocaleString() +
        ' annual reports' +
        weight
      );
    });
  const contextOnly = (cell.top_crimes ?? [])
    .filter((item) => !item.counts_toward_danger_score)
    .slice(0, 2)
    .map(
      (item) =>
        item.label +
        ': ' +
        item.count.toLocaleString() +
        ' reports · shown for context, excluded from the danger score',
    );

  return {
    id: cell.id,
    kind: 'official_safety',
    title: cell.label || 'Safety location',
    locationLabel:
      cell.local_municipality ??
      cell.district_municipality ??
      'Police-station aggregate',
    score: roundScore(safetyScore),
    scoreLabel: 'Safety score',
    bandLabel: safetyBandLabel(band),
    bandColor: band ? BAND_COLORS[band] : '#60646C',
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    meaning:
      'A ' +
      roundScore(safetyScore) +
      '/100 safety score corresponds to a ' +
      roundScore(dangerScore) +
      '/100 danger score. Higher safety scores mean a lower severity-weighted crime burden relative to other police stations in the same financial year.',
    why:
      contributing.length > 0
        ? [...contributing, ...contextOnly]
        : [
            'The score uses severity-weighted crime-category percentiles across police stations in the same financial year.',
          ],
    recommendation: safetyRecommendation(band, confidence),
    methodology:
      'Travel Safe danger-v1.1 compares each scored crime category with the same category across police stations, applies severity weights, then combines those percentile signals. Safety score = 100 − danger score. The top-crime list is context, not a direct percentage decomposition of the score.',
    sourceLabel:
      (cell.source_id || 'DataFirst/SAPS') +
      (cell.year ? ' · ' + cell.year : '') +
      ' · danger-v1.1',
    notes: [
      'Police-station coordinates are area anchors, not incident pins.',
      'The score is comparative and is not a per-capita crime rate or a guarantee of personal safety.',
      'Data-quality confidence reflects completeness/quality signals, not the probability that a person will be safe.',
      ...(cell.quality_flags ?? []).map(humanizeQualityFlag),
    ],
  };
}

export function buildDemoSafetyInsight(zone: SafetyZone): ScoreInsight {
  return {
    id: zone.id,
    kind: 'demo_safety',
    title: zone.name,
    locationLabel: 'Prototype safety area',
    score: roundScore(zone.safetyScore),
    scoreLabel: 'Demo score',
    bandLabel: 'Prototype ranking only',
    bandColor: '#60646C',
    confidence: null,
    confidenceLabel: 'No evidence confidence',
    meaning:
      roundScore(zone.safetyScore) +
      '/100 is a prototype score used to demonstrate the ranking and colour experience.',
    why: [
      'This number is a design fixture. It is not calculated from SAPS/DataFirst crime records.',
      'No real-world factor breakdown exists for this demo score.',
    ],
    recommendation:
      'Use this card to understand the interface only. Do not use this demo score to make a real travel-safety decision; use an official DataFirst/SAPS location when available.',
    methodology:
      'Demo scores are static frontend values. They are intentionally separated from the evidence-backed danger-v1.1 model.',
    sourceLabel: 'Travel Safe prototype fixture',
    notes: [
      'This score is not official crime intelligence.',
      'The live app prefers evidence-backed national safety cells when the backend is available.',
    ],
  };
}

export function buildHaloInsight(halo: Halo): ScoreInsight {
  const community = halo.community;
  const score = community.visitability_score;
  const confidence = community.visitability_confidence;
  const evidencePoints =
    community.rating_count + community.proximity_verified_visit_count;

  let bandLabel = 'New Halo';
  let bandColor = '#60646C';
  let recommendation =
    'There is not enough community evidence yet. Treat this as a discovery suggestion and check the separate area safety score before travelling.';

  if (score != null) {
    if (score >= 80) {
      bandLabel = 'Strong community feedback';
      bandColor = '#22C55E';
      recommendation =
        'Community feedback is strongly positive. This may be worth visiting, but check the separate area safety score and current conditions before you go.';
    } else if (score >= 60) {
      bandLabel = 'Generally positive feedback';
      bandColor = '#F59E0B';
      recommendation =
        'Community feedback is generally positive. Review the evidence count and the separate area safety score before deciding.';
    } else {
      bandLabel = 'Mixed community feedback';
      bandColor = '#EF4444';
      recommendation =
        'Community feedback is mixed or weak. Consider another Halo, especially when the evidence count is still low.';
    }
  }

  if (confidence < 0.3) {
    recommendation +=
      ' Confidence is low because only a small amount of community evidence is available.';
  }

  const ratingLine =
    community.rating_average == null
      ? 'No community rating average yet.'
      : 'Average rating: ' +
        community.rating_average.toFixed(1) +
        '/5 from ' +
        community.rating_count +
        ' rating' +
        (community.rating_count === 1 ? '' : 's') +
        '.';

  return {
    id: halo.id,
    kind: 'halo',
    title: halo.name,
    locationLabel: halo.location_label,
    score: score == null ? null : roundScore(score),
    scoreLabel: 'Visitability',
    bandLabel,
    bandColor,
    confidence,
    confidenceLabel: confidenceLabel(confidence, 'community'),
    meaning:
      score == null
        ? 'This Halo does not have enough ratings to produce a visitability score yet.'
        : roundScore(score) +
          '/100 visitability reflects the average community rating, not crime risk.',
    why: [
      ratingLine,
      community.like_count +
        ' like' +
        (community.like_count === 1 ? '' : 's') +
        ' · ' +
        community.self_reported_visit_count +
        ' self-reported visit' +
        (community.self_reported_visit_count === 1 ? '' : 's') +
        ' · ' +
        community.proximity_verified_visit_count +
        ' proximity-verified visit' +
        (community.proximity_verified_visit_count === 1 ? '' : 's') +
        '.',
      evidencePoints +
        ' evidence point' +
        (evidencePoints === 1 ? '' : 's') +
        ' contribute to the confidence indicator.',
    ],
    recommendation,
    methodology:
      'Halo visitability = average community rating ÷ 5 × 100. Visitability confidence increases with rating evidence and proximity-verified visits, capped at 100%.',
    sourceLabel:
      halo.source === 'seeded_demo'
        ? 'Seeded Travel Safe Halo'
        : 'Community-submitted Halo',
    notes: [
      halo.caution,
      'Visitability confidence reflects the amount of community evidence, not the probability of personal safety.',
      'A highly rated Halo can still be located inside a higher-risk safety area.',
    ],
  };
}
