import { fetchHaloList, parseHalo } from '@/lib/api/halo';

const HALO = {
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
    rating_average: 4.2,
    rating_count: 5,
    like_count: 4,
    self_reported_visit_count: 3,
    proximity_verified_visit_count: 2,
    visitability_score: 84,
    visitability_confidence: 0.7,
  },
};

describe('Halo API', () => {
  it('parses Halo community evidence', () => {
    const parsed = parseHalo(HALO);
    expect(parsed?.community.visitability_score).toBe(84);
    expect(parsed?.community.rating_average).toBe(4.2);
  });

  it('fetches and parses the Halo list', async () => {
    const request = jest.fn().mockResolvedValue({ items: [HALO], count: 1 });

    const result = await fetchHaloList(request);

    expect(request).toHaveBeenCalledWith('/api/v1/halo');
    expect(result.count).toBe(1);
    expect(result.items[0].name).toBe('Test Halo');
  });

  it('rejects invalid Halo payloads', () => {
    expect(parseHalo({ id: 'bad' })).toBeNull();
  });
});
