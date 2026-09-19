import { apiRequest } from '@/lib/api/client';
import type { MapCrimeStat, RiskBand } from '@/lib/api/trips';

export type SourceStatus =
  | 'active'
  | 'reference_only'
  | 'licence_required'
  | 'planned';

export type SafetyStatus = 'available' | 'insufficient_data';

export type DataSource = {
  id: string;
  name: string;
  status: SourceStatus;
  role: string;
  url: string;
  notes: string;
};

export type DatasetStatus = {
  loaded: boolean;
  source_id: string;
  dataset_version: string;
  path: string | null;
  latest_year: string | null;
  years: string[];
  records: number;
  stations_latest_year: number;
  mappable_latest_year: number;
  load_error: string | null;
  nationwide_ready: boolean;
  model_version: string;
  data_mode: string;
};

export type CrimeCategoryStat = {
  category: string;
  count: number;
};

export type AreaStats = {
  area_code: string;
  area_name: string;
  area_type: string;
  period: string;
  total_reported_crimes: number;
  previous_period_total: number | null;
  latest_quarter_total: number | null;
  latest_quarter_previous_year: number | null;
  top_categories: CrimeCategoryStat[];
  source_id: string;
  source_url: string;
  data_resolution: string;
  caveats: string[];
};

export type SafetySignal = {
  area_code: string;
  area_name: string;
  status: SafetyStatus;
  score: number | null;
  confidence: number;
  period: string | null;
  explanation: string[];
  source_ids: string[];
  danger_score: number | null;
  risk_band: RiskBand | null;
  color: string | null;
  top_crimes: MapCrimeStat[];
  model_version: string | null;
};

export type SafetyMapSearchResult = {
  result_type: 'police_station';
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  subtitle: string | null;
  color: string;
  year: string | null;
  danger_score: number | null;
  safety_score: number | null;
  risk_band: RiskBand | null;
  top_crimes: MapCrimeStat[];
};

export type SafetyMapSearchResponse = {
  query: string;
  results: SafetyMapSearchResult[];
};

export async function fetchDataSources(
  request: typeof apiRequest = apiRequest,
): Promise<DataSource[]> {
  return request<DataSource[]>('/api/v1/sources');
}

export async function fetchDatasetStatus(
  request: typeof apiRequest = apiRequest,
): Promise<DatasetStatus> {
  return request<DatasetStatus>('/api/v1/dataset/status');
}

export async function fetchAreaStats(
  areaCode: string,
  year?: string,
  request: typeof apiRequest = apiRequest,
): Promise<AreaStats> {
  const query = new URLSearchParams({ area_code: areaCode });
  if (year) query.set('year', year);
  return request<AreaStats>('/api/v1/stats?' + query.toString());
}

export async function searchSafetyMap(
  queryText: string,
  options: { year?: string; limit?: number } = {},
  request: typeof apiRequest = apiRequest,
): Promise<SafetyMapSearchResponse> {
  const query = new URLSearchParams({
    q: queryText,
    limit: String(options.limit ?? 20),
  });
  if (options.year) query.set('year', options.year);
  return request<SafetyMapSearchResponse>('/api/v1/map/search?' + query.toString());
}

export async function fetchAreaSafetySignal(
  areaCode: string,
  year?: string,
  request: typeof apiRequest = apiRequest,
): Promise<SafetySignal> {
  const query = new URLSearchParams();
  if (year) query.set('year', year);
  const suffix = query.size > 0 ? '?' + query.toString() : '';
  return request<SafetySignal>(
    '/api/v1/areas/' + encodeURIComponent(areaCode) + '/safety' + suffix,
  );
}
