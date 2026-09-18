import type { LivePosition } from '@/lib/location';
import type { RiskBand, SafetyZone } from '@/lib/safety-map';

export type HeatmapCrime = {
  category: string;
  label: string;
  count: number;
  danger_weight: number | null;
  counts_toward_danger_score: boolean;
  signal_note: string | null;
};

export type HeatmapCell = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  reported_crimes: number;
  source_id: string;
  year: string | null;
  danger_score: number | null;
  safety_score: number | null;
  risk_band: RiskBand | null;
  color: string | null;
  confidence: number | null;
  top_crimes: HeatmapCrime[];
};

export type HeatmapResponse = {
  bbox: [number, number, number, number];
  zoom: number;
  cells: HeatmapCell[];
  normalization: string;
  caveats: string[];
  year: string | null;
  source_id: string | null;
  model_version: string | null;
};

export const DEFAULT_SAFETY_YEAR = '2025/2026';
export const CAPE_TOWN_BBOX: [number, number, number, number] = [
  18.2,
  -34.2,
  19.0,
  -33.5,
];

type FetchLike = (
  input: string,
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export function bboxForPosition(
  position?: LivePosition | null,
): [number, number, number, number] {
  if (!position) return CAPE_TOWN_BBOX;

  const latRadius = 0.3;
  const lngRadius = 0.4;
  const rounded = (value: number) => Number(value.toFixed(6));
  return [
    rounded(position.longitude - lngRadius),
    rounded(position.latitude - latRadius),
    rounded(position.longitude + lngRadius),
    rounded(position.latitude + latRadius),
  ];
}

export function heatmapCellsToSafetyZones(
  cells: HeatmapCell[],
): SafetyZone[] {
  return cells
    .filter(
      (
        cell,
      ): cell is HeatmapCell & {
        safety_score: number;
        risk_band: RiskBand;
        color: string;
      } =>
        cell.safety_score !== null &&
        cell.risk_band !== null &&
        cell.color !== null,
    )
    .map((cell) => ({
      id: cell.id,
      name: cell.label,
      latitude: cell.latitude,
      longitude: cell.longitude,
      safetyScore: cell.safety_score,
      riskBand: cell.risk_band,
      color: cell.color,
    }));
}

export async function fetchSafetyHeatmap(
  apiBaseUrl: string,
  bbox: [number, number, number, number],
  options: {
    year?: string;
    zoom?: number;
    limit?: number;
  } = {},
  fetchImpl: FetchLike = fetch,
): Promise<HeatmapResponse> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    bbox: bbox.join(','),
    year: options.year ?? DEFAULT_SAFETY_YEAR,
    zoom: String(options.zoom ?? 10),
    limit: String(options.limit ?? 300),
  });

  const response = await fetchImpl(
    `${base}/api/v1/heatmap?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Safety heatmap request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as HeatmapResponse;
}
