import {
  createLocationGroup,
  fetchGroupLocations,
  joinLocationGroup,
  publishLocation,
} from '@/lib/location-groups';

describe('location group API adapter', () => {
  it('creates a group', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        group_code: 'ABC123',
        group_key: 'secret-key',
        created_at: '2026-09-18T12:00:00Z',
        storage: 'memory_only',
        warning: 'demo only',
      }),
    });

    const result = await createLocationGroup(
      'https://api.example.test/',
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/location-groups',
      { method: 'POST' },
    );
    expect(result.group_code).toBe('ABC123');
  });

  it('joins with the group key header', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        group_code: 'ABC123',
        client_id: 'client-1',
        display_name: 'Alice',
        joined_at: '2026-09-18T12:00:00Z',
      }),
    });

    await joinLocationGroup(
      'https://api.example.test',
      'ABC123',
      'secret-key',
      'client-1',
      'Alice',
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/location-groups/ABC123/join',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Group-Key': 'secret-key',
        }),
      }),
    );
  });

  it('publishes and polls latest locations', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          client_id: 'client-1',
          display_name: 'Alice',
          latitude: -33.92,
          longitude: 18.42,
          server_timestamp: '2026-09-18T12:00:00Z',
          stale: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          group_code: 'ABC123',
          members: [],
          server_timestamp: '2026-09-18T12:00:15Z',
          stale_after_seconds: 120,
          polling_interval_seconds: 15,
        }),
      });

    await publishLocation(
      'https://api.example.test',
      'ABC123',
      'secret-key',
      'client-1',
      -33.92,
      18.42,
      fetchImpl,
    );
    const snapshot = await fetchGroupLocations(
      'https://api.example.test',
      'ABC123',
      'secret-key',
      fetchImpl,
    );

    expect(snapshot.polling_interval_seconds).toBe(15);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'https://api.example.test/api/v1/location-groups/ABC123/locations',
      expect.objectContaining({
        headers: { 'X-Group-Key': 'secret-key' },
      }),
    );
  });
});
