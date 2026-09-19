import {
  fetchEmergencyNumbers,
  fetchEmergencyServices,
  fetchLocationEmergencyNumbers,
} from '@/lib/api/emergency';
import { fetchBackendHealth } from '@/lib/api/health';
import {
  createHalo,
  fetchHalo,
  fetchHaloListFiltered,
  rateHalo,
  setHaloRatingEnabled,
} from '@/lib/api/halo';
import {
  createLocationGroup,
  fetchLocationGroupSnapshot,
  joinLocationGroup,
  updateLocationGroupMember,
} from '@/lib/api/location-groups';
import { analyseRoutes } from '@/lib/api/routes';
import {
  fetchAreaSafetySignal,
  fetchAreaStats,
  fetchDataSources,
  fetchDatasetStatus,
  searchSafetyMap,
} from '@/lib/api/safety-intelligence';
import { searchTravelSafe } from '@/lib/api/search';

const HALO = {
  id: 'halo-test',
  name: 'Test Halo',
  description: 'A useful community place.',
  location_label: 'Cape Town',
  latitude: -33.92,
  longitude: 18.42,
  created_at: '2026-09-19T00:00:00Z',
  submitted_by: 'tester',
  source: 'community_submission',
  caution:
    'Halo visitability is community feedback and does not change the area danger or safety score.',
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
};

describe('backend API contract adapters', () => {
  it('covers backend health and emergency read APIs', async () => {
    const health = jest.fn().mockResolvedValue({ status: 'ok' });
    await fetchBackendHealth(health);
    expect(health).toHaveBeenCalledWith('/health');

    const numbers = jest.fn().mockResolvedValue({ region: 'South Africa', numbers: [] });
    await fetchEmergencyNumbers('police', numbers);
    expect(numbers.mock.calls[0][0]).toContain('/api/v1/emergency-numbers?');
    expect(numbers.mock.calls[0][0]).toContain('service_type=police');

    const local = jest.fn().mockResolvedValue({
      in_cape_town: true,
      police: { label: 'SAPS Flying Squad', number: '10111' },
      fire: { label: 'National emergency number', number: '112' },
      hospital: { label: 'City of Cape Town Emergency Services', number: '0214807700' },
    });
    await fetchLocationEmergencyNumbers(-33.92, 18.42, local);
    expect(local.mock.calls[0][0]).toContain('/api/v1/emergency/numbers?');
    expect(local.mock.calls[0][0]).toContain('lat=-33.92');
    expect(local.mock.calls[0][0]).toContain('lon=18.42');

    const services = jest.fn().mockResolvedValue({ region: 'Cape Town', services: [] });
    await fetchEmergencyServices('healthcare', services);
    expect(services.mock.calls[0][0]).toContain('/api/v1/emergency-services?');
    expect(services.mock.calls[0][0]).toContain('service_type=healthcare');
  });

  it('covers safety intelligence and both search APIs', async () => {
    const sources = jest.fn().mockResolvedValue([]);
    await fetchDataSources(sources);
    expect(sources).toHaveBeenCalledWith('/api/v1/sources');

    const status = jest.fn().mockResolvedValue({ loaded: true });
    await fetchDatasetStatus(status);
    expect(status).toHaveBeenCalledWith('/api/v1/dataset/status');

    const stats = jest.fn().mockResolvedValue({ area_code: 'cape-town-central' });
    await fetchAreaStats('cape town central', '2025/2026', stats);
    expect(stats.mock.calls[0][0]).toContain('/api/v1/stats?');
    expect(stats.mock.calls[0][0]).toContain('area_code=cape+town+central');
    expect(stats.mock.calls[0][0]).toContain('year=2025%2F2026');

    const mapSearch = jest.fn().mockResolvedValue({ query: 'cape', results: [] });
    await searchSafetyMap('cape', { year: '2025/2026', limit: 7 }, mapSearch);
    expect(mapSearch.mock.calls[0][0]).toContain('/api/v1/map/search?');
    expect(mapSearch.mock.calls[0][0]).toContain('limit=7');

    const signal = jest.fn().mockResolvedValue({ area_code: 'cape-town-central' });
    await fetchAreaSafetySignal('cape-town-central', '2025/2026', signal);
    expect(signal.mock.calls[0][0]).toBe(
      '/api/v1/areas/cape-town-central/safety?year=2025%2F2026',
    );

    const appSearch = jest.fn().mockResolvedValue({ query: 'garden', results: [], count: 0 });
    await searchTravelSafe('garden', { limit: 5 }, appSearch);
    expect(appSearch.mock.calls[0][0]).toContain('/api/v1/search?');
    expect(appSearch.mock.calls[0][0]).toContain('limit=5');
  });

  it('covers full Halo read/write contract with client identity', async () => {
    const filtered = jest.fn().mockResolvedValue({ items: [HALO], count: 1 });
    await fetchHaloListFiltered(
      {
        query: 'garden',
        bbox: [18.3, -34.0, 18.6, -33.8],
      },
      filtered,
    );
    expect(filtered.mock.calls[0][0]).toContain('/api/v1/halo?');
    expect(filtered.mock.calls[0][0]).toContain('q=garden');
    expect(filtered.mock.calls[0][0]).toContain(
      'bbox=18.3%2C-34%2C18.6%2C-33.8',
    );

    const get = jest.fn().mockResolvedValue(HALO);
    await fetchHalo('halo test', get);
    expect(get).toHaveBeenCalledWith('/api/v1/halo/halo%20test');

    const create = jest.fn().mockResolvedValue(HALO);
    await createHalo(
      {
        name: 'Test Halo',
        description: 'A useful community place.',
        location_label: 'Cape Town',
        latitude: -33.92,
        longitude: 18.42,
      },
      'client-123',
      create,
    );
    expect(create).toHaveBeenCalledWith(
      '/api/v1/halo',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Client-ID': 'client-123' },
        body: expect.objectContaining({ rating_enabled: true }),
      }),
    );

    const rate = jest.fn().mockResolvedValue({
      halo: HALO,
      client_id: 'client-123',
      rating: 5,
      liked: true,
      visited: true,
      proximity_verified: true,
      updated_at: '2026-09-19T00:00:00Z',
    });
    await rateHalo(
      'halo-test',
      {
        rating: 5,
        liked: true,
        visited: true,
        visit_latitude: -33.92,
        visit_longitude: 18.42,
      },
      'client-123',
      rate,
    );
    expect(rate).toHaveBeenCalledWith(
      '/api/v1/halo/halo-test/rating',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'X-Client-ID': 'client-123' },
      }),
    );

    const settings = jest.fn().mockResolvedValue(HALO);
    await setHaloRatingEnabled('halo-test', false, 'client-123', settings);
    expect(settings).toHaveBeenCalledWith(
      '/api/v1/halo/halo-test/rating-settings',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'X-Client-ID': 'client-123' },
        body: { enabled: false },
      }),
    );
  });

  it('covers trusted location group lifecycle and required group key', async () => {
    const create = jest.fn().mockResolvedValue({
      group_code: 'ABC123',
      group_key: 'secret',
      created_at: '2026-09-19T00:00:00Z',
      storage: 'memory_only',
      warning: 'demo',
    });
    await createLocationGroup(create);
    expect(create).toHaveBeenCalledWith('/api/v1/location-groups', {
      method: 'POST',
    });

    const join = jest.fn().mockResolvedValue({
      group_code: 'ABC123',
      client_id: 'client-1',
      display_name: 'Seni',
      joined_at: '2026-09-19T00:00:00Z',
    });
    await joinLocationGroup(
      'ABC123',
      'secret',
      { client_id: 'client-1', display_name: 'Seni' },
      join,
    );
    expect(join).toHaveBeenCalledWith(
      '/api/v1/location-groups/ABC123/join',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Group-Key': 'secret' },
      }),
    );

    const update = jest.fn().mockResolvedValue({
      client_id: 'client-1',
      display_name: 'Seni',
      latitude: -33.92,
      longitude: 18.42,
      server_timestamp: '2026-09-19T00:00:00Z',
      stale: false,
    });
    await updateLocationGroupMember(
      'ABC123',
      'secret',
      'client-1',
      { latitude: -33.92, longitude: 18.42 },
      update,
    );
    expect(update).toHaveBeenCalledWith(
      '/api/v1/location-groups/ABC123/members/client-1/location',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'X-Group-Key': 'secret' },
      }),
    );

    const snapshot = jest.fn().mockResolvedValue({
      group_code: 'ABC123',
      members: [],
      server_timestamp: '2026-09-19T00:00:00Z',
      stale_after_seconds: 120,
      polling_interval_seconds: 15,
    });
    await fetchLocationGroupSnapshot('ABC123', 'secret', snapshot);
    expect(snapshot).toHaveBeenCalledWith(
      '/api/v1/location-groups/ABC123/locations',
      { headers: { 'X-Group-Key': 'secret' } },
    );
  });

  it('covers lower-risk route analysis without replacing directions', async () => {
    const request = jest.fn().mockResolvedValue({
      lower_risk_route_id: 'route-a',
      year: '2025/2026',
      model_version: 'danger-v1.1',
      routes: [],
      selection_basis: 'relative exposure',
      caveats: [],
    });

    await analyseRoutes(
      {
        candidates: [
          {
            id: 'route-a',
            profile: 'walking',
            distance_meters: 1200,
            duration_seconds: 900,
            coordinates: [
              { latitude: -33.92, longitude: 18.42 },
              { latitude: -33.93, longitude: 18.43 },
            ],
          },
        ],
      },
      request,
    );

    expect(request).toHaveBeenCalledWith('/api/v1/routes/analyse', {
      method: 'POST',
      body: expect.objectContaining({
        year: '2025/2026',
        candidates: expect.any(Array),
      }),
    });
  });
});
