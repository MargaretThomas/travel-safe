import {
  bboxForPosition,
  fetchSafetyHeatmap,
  heatmapCellsToSafetyZones,
} from '@/lib/safety-api';

describe('safety API adapter', () => {
  it('builds a local bbox around a live position', () => {
    expect(
      bboxForPosition({ latitude: -33.92, longitude: 18.42 }),
    ).toEqual([18.02, -34.22, 18.82, -33.62]);
  });

  it('maps backend cells into frontend safety zones', () => {
    const zones = heatmapCellsToSafetyZones([
      {
        id: 'woodstock-2025-2026',
        latitude: -33.93,
        longitude: 18.45,
        label: 'woodstock',
        reported_crimes: 100,
        source_id: 'datafirst-saps-annual-v1.4',
        year: '2025/2026',
        danger_score: 80,
        safety_score: 20,
        risk_band: 'red',
        color: '#EF4444',
        confidence: 0.9,
        top_crimes: [],
      },
    ]);

    expect(zones).toEqual([
      {
        id: 'woodstock-2025-2026',
        name: 'woodstock',
        latitude: -33.93,
        longitude: 18.45,
        safetyScore: 20,
        riskBand: 'red',
        color: '#EF4444',
      },
    ]);
  });

  it('requests the versioned heatmap contract', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bbox: [18.2, -34.2, 19, -33.5],
        zoom: 10,
        cells: [],
        normalization: 'test',
        caveats: [],
        year: '2025/2026',
        source_id: 'datafirst-saps-annual-v1.4',
        model_version: 'danger-v1.1',
      }),
    });

    await fetchSafetyHeatmap(
      'https://api.example.test/',
      [18.2, -34.2, 19, -33.5],
      {},
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/heatmap?');
    expect(url).toContain('year=2025%2F2026');
    expect(url).toContain('zoom=10');
  });

  it('throws when the backend rejects the request', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(
      fetchSafetyHeatmap(
        'https://api.example.test',
        [18.2, -34.2, 19, -33.5],
        {},
        fetchImpl,
      ),
    ).rejects.toThrow('status 404');
  });
});
