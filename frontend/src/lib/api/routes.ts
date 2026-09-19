import { apiRequest } from '@/lib/api/client';
import type { RiskBand } from '@/lib/api/trips';

export type RouteProfile = 'walking' | 'driving' | 'cycling';
export type RouteContextStatus = 'available' | 'insufficient_data';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteCandidate = {
  id: string;
  profile: RouteProfile;
  distance_meters: number;
  duration_seconds: number;
  coordinates: RouteCoordinate[];
};

export type RouteAnalyseInput = {
  year?: string;
  candidates: RouteCandidate[];
};

export type RouteHaloContext = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_from_route_meters: number;
  visitability_score: number | null;
  visitability_confidence: number;
};

export type RouteRiskResult = {
  id: string;
  profile: RouteProfile;
  distance_meters: number;
  duration_seconds: number;
  context_status: RouteContextStatus;
  exposure_score: number | null;
  safety_context_score: number | null;
  exposure_band: RiskBand | null;
  green_exposure_ratio: number;
  orange_exposure_ratio: number;
  red_exposure_ratio: number;
  max_danger_score: number | null;
  confidence: number;
  sampled_points: number;
  nearby_halo: RouteHaloContext[];
};

export type RouteAnalyseResponse = {
  lower_risk_route_id: string | null;
  year: string;
  model_version: string;
  routes: RouteRiskResult[];
  selection_basis: string;
  caveats: string[];
};

export async function analyseRoutes(
  input: RouteAnalyseInput,
  request: typeof apiRequest = apiRequest,
): Promise<RouteAnalyseResponse> {
  return request<RouteAnalyseResponse>('/api/v1/routes/analyse', {
    method: 'POST',
    body: {
      year: input.year ?? '2025/2026',
      candidates: input.candidates,
    },
  });
}
