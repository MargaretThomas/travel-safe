import {
  bboxForCoordinate,
  CAPE_TOWN_DEMO_BBOX,
  fetchSafetyHeatmap,
  parseSafetyHeatmapResponse,
} from './safety';

const CELL = {
  id: 'cape-town-central',
  latitude: -33.92774,
  longitude: 18.4231,
  label: 'Cape Town Central',
  reported_crimes: 100,
  relative_intensity: 0.5,
  resolution: 'police_station_annual_aggregate',
  source_id: 'datafirst-saps-annual-v1.4',
};

describe('safety API', () => {
  it('uses the Cape Town demo bbox without a coordinate', () => {
    expect(bboxForCoordinate(null)).toEqual(CAPE_TOWN_DEMO_BBOX);
  });

  it('builds a stable bbox around a live coordinate', () => {
    expect(
      bboxForCoordinate({
        latitude: -33.97,
        longitude: 18.37,
      }),
    ).toEqual([18.02, -34.22, 18.72, -33.72]);
  });

  it('parses the national heatmap contract', () => {
    const parsed = parseSafetyHeatmapResponse({
      bbox: [18.2, -34.2, 19, -33.5],
      zoom: 10,
      cells: [CELL],
      normalization: 'danger-v1.1',
      caveats: ['Annual station aggregate'],
      year: '2025/2026',
      source_id: 'datafirst-saps-annual-v1.4',
      model_version: 'danger-v1.1',
    });

    expect(parsed?.cells).toHaveLength(1);
    expect(parsed?.source_id).toBe('datafirst-saps-annual-v1.4');
    expect(parsed?.model_version).toBe('danger-v1.1');
  });

  it('requests the backend heatmap with bbox/year/zoom', async () => {
    const request = jest.fn().mockResolvedValue({
      bbox: [18.2, -34.2, 19, -33.5],
      zoom: 10,
      cells: [CELL],
      normalization: 'danger-v1.1',
      caveats: [],
      year: '2025/2026',
      source_id: 'datafirst-saps-annual-v1.4',
      model_version: 'danger-v1.1',
    });

    const result = await fetchSafetyHeatmap(
      [18.2, -34.2, 19, -33.5],
      {},
      request,
    );

    expect(result.cells).toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toContain('/api/v1/heatmap?');
    expect(request.mock.calls[0][0]).toContain(
      'year=2025%2F2026',
    );
    expect(request.mock.calls[0][0]).toContain('zoom=10');
  });
});
