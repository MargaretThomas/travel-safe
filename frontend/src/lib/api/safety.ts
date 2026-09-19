import { apiRequest } from '@/lib/api/client';
import { parseHeatmapCell, type HeatmapCell } from '@/lib/api/trips';
import type { MapCoordinate } from '@/lib/map/map.types';

export type HeatmapBbox = [number, number, number, number];

export type SafetyHeatmapResponse = {
  bbox: HeatmapBbox;
  zoom: number;
  cells: HeatmapCell[];
  normalization: string;
  caveats: string[];
  year?: string | null;
  source_id?: string | null;
  model_version?: string | null;
};

export const CAPE_TOWN_DEMO_BBOX: HeatmapBbox = [
  18.2,
  -34.2,
  19.0,
  -33.5,
];

export function bboxForCoordinate(
  coordinate?: MapCoordinate | null,
): HeatmapBbox {
  if (!coordinate) return CAPE_TOWN_DEMO_BBOX;

  const latitudeRadius = 0.25;
  const longitudeRadius = 0.35;
  const rounded = (value: number) => Number(value.toFixed(6));

  return [
    rounded(coordinate.longitude - longitudeRadius),
    rounded(coordinate.latitude - latitudeRadius),
    rounded(coordinate.longitude + longitudeRadius),
    rounded(coordinate.latitude + latitudeRadius),
  ];
}

function parseBbox(value: unknown): HeatmapBbox | null {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every(
      (item) => typeof item === 'number' && Number.isFinite(item),
    )
  ) {
    return null;
  }

  return [value[0], value[1], value[2], value[3]];
}

export function parseSafetyHeatmapResponse(
  value: unknown,
): SafetyHeatmapResponse | null {
  if (value == null || typeof value !== 'object') return null;

  const candidate = value as {
    bbox?: unknown;
    zoom?: unknown;
    cells?: unknown;
    normalization?: unknown;
    caveats?: unknown;
    year?: unknown;
    source_id?: unknown;
    model_version?: unknown;
  };

  const bbox = parseBbox(candidate.bbox);
  if (!bbox || !Array.isArray(candidate.cells)) return null;

  const cells = candidate.cells
    .map(parseHeatmapCell)
    .filter((cell): cell is HeatmapCell => cell != null);

  return {
    bbox,
    zoom: typeof candidate.zoom === 'number' ? candidate.zoom : 10,
    cells,
    normalization:
      typeof candidate.normalization === 'string'
        ? candidate.normalization
        : '',
    caveats: Array.isArray(candidate.caveats)
      ? candidate.caveats.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    year: typeof candidate.year === 'string' ? candidate.year : null,
    source_id:
      typeof candidate.source_id === 'string'
        ? candidate.source_id
        : null,
    model_version:
      typeof candidate.model_version === 'string'
        ? candidate.model_version
        : null,
  };
}

export async function fetchSafetyHeatmap(
  bbox: HeatmapBbox,
  options: {
    zoom?: number;
    year?: string;
    limit?: number;
  } = {},
  request: typeof apiRequest = apiRequest,
): Promise<SafetyHeatmapResponse> {
  const params = new URLSearchParams({
    bbox: bbox.join(','),
    zoom: String(options.zoom ?? 10),
    year: options.year ?? '2025/2026',
    limit: String(options.limit ?? 500),
  });

  const payload = await request<unknown>(
    `/api/v1/heatmap?${params.toString()}`,
  );
  const parsed = parseSafetyHeatmapResponse(payload);
  if (!parsed) {
    throw new Error('Safety heatmap response was invalid');
  }
  return parsed;
}
