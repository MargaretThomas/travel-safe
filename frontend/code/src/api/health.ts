export async function checkBackendHealth(): Promise<boolean> {
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!API_BASE_URL) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      return false;
    }

    const body: unknown = await response.json();

    return (
      typeof body === 'object' &&
      body !== null &&
      'status' in body &&
      body.status === 'ok'
    );
  } catch {
    return false;
  }
}
