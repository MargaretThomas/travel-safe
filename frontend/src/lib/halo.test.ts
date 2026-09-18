import {
  createHalo,
  fetchHalo,
  rateHalo,
  setHaloRatingEnabled,
} from '@/lib/halo';

describe('Halo API adapter', () => {
  it('fetches the canonical Halo collection', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], count: 0 }),
    });

    await fetchHalo(
      'https://api.example.test/',
      { query: 'garden' },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/halo?q=garden',
    );
  });

  it('submits a Halo with temporary client identity', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'halo-1',
        name: 'Viewpoint',
        description: 'A local viewpoint',
        location_label: 'Cape Town',
        latitude: -33.92,
        longitude: 18.42,
        created_at: '2026-09-18T12:00:00Z',
        submitted_by: null,
        source: 'community_submission',
        community: {
          rating_enabled: true,
          rating_average: null,
          rating_count: 0,
          like_count: 0,
          self_reported_visit_count: 0,
          proximity_verified_visit_count: 0,
          visitability_score: null,
          visitability_confidence: 0,
        },
        caution: 'Halo visitability does not change danger.',
      }),
    });

    await createHalo(
      'https://api.example.test',
      'device-1',
      {
        name: 'Viewpoint',
        description: 'A local viewpoint',
        location_label: 'Cape Town',
        latitude: -33.92,
        longitude: 18.42,
      },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/halo',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Client-ID': 'device-1',
        }),
      }),
    );
  });

  it('rates a Halo with one client identity', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        halo: {},
        client_id: 'device-1',
        rating: 5,
        liked: true,
        visited: true,
        proximity_verified: true,
        updated_at: '2026-09-18T12:00:00Z',
      }),
    });

    await rateHalo(
      'https://api.example.test',
      'device-1',
      'halo-1',
      {
        rating: 5,
        liked: true,
        visited: true,
        visit_latitude: -33.92,
        visit_longitude: 18.42,
      },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/halo/halo-1/rating',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-Client-ID': 'device-1',
        }),
      }),
    );
  });

  it('lets the submitting client toggle rating', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'halo-1' }),
    });

    await setHaloRatingEnabled(
      'https://api.example.test',
      'device-owner',
      'halo-1',
      false,
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/halo/halo-1/rating-settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ enabled: false }),
      }),
    );
  });
});
