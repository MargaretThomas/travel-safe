const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

export function trimEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function getApiBaseUrl(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const configured = trimEnv(env.EXPO_PUBLIC_API_BASE_URL);
  return configured.replace(/\/+$/, '') || DEFAULT_API_BASE_URL;
}

export function getMapboxToken(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  return trimEnv(env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);
}
