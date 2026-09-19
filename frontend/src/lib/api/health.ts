import { apiRequest } from '@/lib/api/client';

export type BackendHealth = {
  status: string;
};

export async function fetchBackendHealth(
  request: typeof apiRequest = apiRequest,
): Promise<BackendHealth> {
  return request<BackendHealth>('/health');
}
