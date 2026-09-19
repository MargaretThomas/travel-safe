import type { Halo } from '@/lib/api/halo';
import type { HeatmapCell } from '@/lib/api/trips';
import {
  buildDemoSafetyInsight,
  buildHaloInsight,
  buildSafetyInsight,
} from '@/lib/score-insights';
import { MOCK_SAFETY_ZONES } from '@/lib/safety-map';

describe('score insights', () => {
  it('explains an official safety score using evidence-backed methodology', () => {
    const cell: HeatmapCell = {
      id: 'cape-town-central-2025-2026',
      latitude: -33.92,
      longitude: 18.42,
      label: 'Cape Town Central',
      reported_crimes: 1200,
      relative_intensity: 0.32,
      resolution: 'police_station_annual_aggregate',
      source_id: 'datafirst-saps-annual-v1.4',
      year: '2025/2026',
      danger_score: 32,
      safety_score: 68,
      risk_band: 'green',
      confidence: 0.9,
      top_crimes: [
        {
          category: 'assault_gbh',
          label: 'Assault GBH',
          count: 240,
          danger_weight: 0.75,
          counts_toward_danger_score: true,
        },
        {
          category: 'drug_crime',
          label: 'Drug-related crime',
          count: 400,
          counts_toward_danger_score: false,
          signal_note: 'Police-action detection signal; excluded from danger score.',
        },
      ],
      quality_flags: [],
    };

    const insight = buildSafetyInsight(cell);

    expect(insight.score).toBe(68);
    expect(insight.bandLabel).toContain('Lower');
    expect(insight.meaning).toContain('32/100 danger score');
    expect(insight.why[0]).toContain('Assault GBH');
    expect(insight.why.join(' ')).toContain('excluded from the danger score');
    expect(insight.methodology).toContain('Safety score = 100 − danger score');
    expect(insight.sourceLabel).toContain('2025/2026');
  });

  it('clearly labels Bayview 93 as a prototype score, not official evidence', () => {
    const bayview = MOCK_SAFETY_ZONES.find((zone) => zone.id === 'bayview');
    expect(bayview).toBeDefined();

    const insight = buildDemoSafetyInsight(bayview!);

    expect(insight.score).toBe(93);
    expect(insight.kind).toBe('demo_safety');
    expect(insight.why.join(' ')).toContain('design fixture');
    expect(insight.recommendation).toContain('Do not use this demo score');
  });

  it('keeps Halo visitability separate from crime risk', () => {
    const halo: Halo = {
      id: 'halo-test',
      name: 'Test Halo',
      description: 'A useful community place.',
      location_label: 'Cape Town',
      latitude: -33.92,
      longitude: 18.42,
      source: 'community_submission',
      caution:
        'Halo visitability is community feedback and does not change the area danger or safety score.',
      community: {
        rating_enabled: true,
        rating_average: 4.5,
        rating_count: 4,
        like_count: 3,
        self_reported_visit_count: 3,
        proximity_verified_visit_count: 2,
        visitability_score: 90,
        visitability_confidence: 0.6,
      },
    };

    const insight = buildHaloInsight(halo);

    expect(insight.score).toBe(90);
    expect(insight.scoreLabel).toBe('Visitability');
    expect(insight.meaning).toContain('not crime risk');
    expect(insight.notes.join(' ')).toContain('does not change');
  });
});
