import { ApiError, apiRequest, joinApiUrl } from './client';

describe('api client', () => {
  it('joins base URLs and paths', () => {
    expect(joinApiUrl('http://127.0.0.1:8000/', '/api/v1/trips')).toBe(
      'http://127.0.0.1:8000/api/v1/trips',
    );
    expect(joinApiUrl('http://127.0.0.1:8000', 'api/v1/trips')).toBe(
      'http://127.0.0.1:8000/api/v1/trips',
    );
  });

  it('posts JSON and parses the response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    const result = await apiRequest<{ ok: boolean }>('/api/v1/trips', {
      method: 'POST',
      body: { hello: 'world' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: 'http://example.test',
    });
    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://example.test/api/v1/trips',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
      }),
    );
  });

  it('supports PUT requests and preserves custom backend headers', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await apiRequest('/api/v1/halo/example/rating', {
      method: 'PUT',
      headers: { 'X-Client-ID': 'client-123' },
      body: { rating: 5 },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: 'http://example.test',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://example.test/api/v1/halo/example/rating',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Client-ID': 'client-123',
        }),
        body: JSON.stringify({ rating: 5 }),
      }),
    );
  });

  it('throws ApiError on non-OK responses', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({}),
    });
    await expect(
      apiRequest('/api/v1/trips', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        baseUrl: 'http://example.test',
      }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 422 });
    expect(new ApiError('nope', 500).status).toBe(500);
  });
});
