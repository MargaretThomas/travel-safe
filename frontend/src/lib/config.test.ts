import { getApiBaseUrl, getMapboxToken, trimEnv } from './config';

describe('config', () => {
  it('trims env values', () => {
    expect(trimEnv('  abc  ')).toBe('abc');
    expect(trimEnv(undefined)).toBe('');
  });

  it('uses the default API base URL when unset', () => {
    expect(getApiBaseUrl({})).toBe('http://127.0.0.1:8000');
  });

  it('strips trailing slashes from the API base URL', () => {
    expect(getApiBaseUrl({ EXPO_PUBLIC_API_BASE_URL: 'http://localhost:8000/' })).toBe(
      'http://localhost:8000',
    );
  });

  it('reads the Mapbox public token', () => {
    expect(getMapboxToken({})).toBe('');
    expect(getMapboxToken({ EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: ' pk.test ' })).toBe('pk.test');
  });
});
