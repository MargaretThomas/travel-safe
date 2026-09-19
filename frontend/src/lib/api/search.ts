import { apiRequest } from '@/lib/api/client';
import type { RiskBand } from '@/lib/api/trips';

export type TravelSafeSearchResult = {
  result_type: 'halo' | 'police_station';
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  subtitle: string | null;
  color: string | null;
  danger_score: number | null;
  safety_score: number | null;
  risk_band: RiskBand | null;
  year: string | null;
  visitability_score: number | null;
  rating_average: number | null;
  rating_count: number | null;
  caution: string | null;
};

export type TravelSafeSearchResponse = {
  query: string;
  results: TravelSafeSearchResult[];
  count: number;
  external_geocoding: string;
};

export async function searchTravelSafe(
  queryText: string,
  options: { year?: string; limit?: number } = {},
  request: typeof apiRequest = apiRequest,
): Promise<TravelSafeSearchResponse> {
  const query = new URLSearchParams({
    q: queryText,
    limit: String(options.limit ?? 20),
  });
  if (options.year) query.set('year', options.year);
  return request<TravelSafeSearchResponse>('/api/v1/search?' + query.toString());
}
