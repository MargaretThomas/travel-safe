import { apiRequest } from '@/lib/api/client';
import { isValidCoordinate } from '@/lib/map/coordinates';
import type { MapCoordinate } from '@/lib/map/map.types';

export type TripProfile = 'walking' | 'driving';
export type PathwayProvider = 'mapbox' | 'osrm' | 'mock';

export type TripPoint = MapCoordinate & {
  label?: string;
};

export type RiskBand = 'green' | 'orange' | 'red';

export type MapCrimeStat = {
  category: string;
  label: string;
  count: number;
  danger_weight?: number | null;
  counts_toward_danger_score: boolean;
  signal_note?: string | null;
};

export type HeatmapCell = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  reported_crimes: number;
  relative_intensity: number;
  resolution: string;
  source_id: string;
  year?: string | null;
  local_municipality?: string | null;
  district_municipality?: string | null;
  danger_score?: number | null;
  safety_score?: number | null;
  risk_band?: RiskBand | null;
  color?: string | null;
  confidence?: number | null;
  top_crimes?: MapCrimeStat[];
  quality_flags?: string[];
};

export type TripHeatmap = {
  bbox: [number, number, number, number];
  zoom: number;
  cells: HeatmapCell[];
  normalization: string;
  caveats: string[];
};

export type TripPathway = {
  coordinates: [number, number][];
  distance_meters: number;
  duration_seconds: number;
  provider: PathwayProvider;
};

export type TripPlan = {
  origin: TripPoint;
  destination: TripPoint;
  pathway: TripPathway;
  heatmap: TripHeatmap;
};

export type CreateTripInput = {
  origin: TripPoint;
  destination: TripPoint;
  profile?: TripProfile;
};

function isLngLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  );
}

export function parseTripPoint(value: unknown): TripPoint | null {
  if (value == null || typeof value !== 'object') return null;
  const candidate = value as { latitude?: unknown; longitude?: unknown; label?: unknown };
  const label =
    typeof candidate.label === 'string' && candidate.label.length > 0
      ? candidate.label
      : null;
  if (!isValidCoordinate(candidate)) return null;
  const point: TripPoint = {
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  };
  if (label) point.label = label;
  return point;
}

export function parseHeatmapCell(value: unknown): HeatmapCell | null {
  if (value == null || typeof value !== 'object') return null;
  const candidate = value as HeatmapCell;
  if (typeof candidate.id !== 'string') return null;
  if (!isValidCoordinate({ latitude: candidate.latitude, longitude: candidate.longitude })) return null;
  if (typeof candidate.relative_intensity !== 'number' || !Number.isFinite(candidate.relative_intensity)) {
    return null;
  }

  const topCrimes = Array.isArray(candidate.top_crimes)
    ? candidate.top_crimes
        .filter(
          (item): item is MapCrimeStat =>
            item != null &&
            typeof item === 'object' &&
            typeof item.category === 'string' &&
            typeof item.label === 'string' &&
            typeof item.count === 'number' &&
            Number.isFinite(item.count) &&
            typeof item.counts_toward_danger_score === 'boolean',
        )
        .map((item) => ({
          category: item.category,
          label: item.label,
          count: Math.max(0, item.count),
          danger_weight:
            typeof item.danger_weight === 'number' && Number.isFinite(item.danger_weight)
              ? item.danger_weight
              : null,
          counts_toward_danger_score: item.counts_toward_danger_score,
          signal_note: typeof item.signal_note === 'string' ? item.signal_note : null,
        }))
    : [];

  const score = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : null;

  return {
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    label: typeof candidate.label === 'string' ? candidate.label : '',
    reported_crimes: typeof candidate.reported_crimes === 'number' ? candidate.reported_crimes : 0,
    relative_intensity: Math.min(1, Math.max(0, candidate.relative_intensity)),
    resolution: typeof candidate.resolution === 'string' ? candidate.resolution : 'precinct_aggregate',
    source_id: typeof candidate.source_id === 'string' ? candidate.source_id : 'unknown',
    year: typeof candidate.year === 'string' ? candidate.year : null,
    local_municipality:
      typeof candidate.local_municipality === 'string' ? candidate.local_municipality : null,
    district_municipality:
      typeof candidate.district_municipality === 'string' ? candidate.district_municipality : null,
    danger_score: score(candidate.danger_score),
    safety_score: score(candidate.safety_score),
    risk_band:
      candidate.risk_band === 'green' ||
      candidate.risk_band === 'orange' ||
      candidate.risk_band === 'red'
        ? candidate.risk_band
        : null,
    color: typeof candidate.color === 'string' ? candidate.color : null,
    confidence:
      typeof candidate.confidence === 'number' && Number.isFinite(candidate.confidence)
        ? Math.min(1, Math.max(0, candidate.confidence))
        : null,
    top_crimes: topCrimes,
    quality_flags: Array.isArray(candidate.quality_flags)
      ? candidate.quality_flags.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

export function parseTripResponse(value: unknown): TripPlan | null {
  if (value == null || typeof value !== 'object') return null;
  const candidate = value as {
    origin?: unknown;
    destination?: unknown;
    pathway?: {
      coordinates?: unknown;
      distance_meters?: unknown;
      duration_seconds?: unknown;
      provider?: unknown;
    };
    heatmap?: {
      bbox?: unknown;
      zoom?: unknown;
      cells?: unknown;
      normalization?: unknown;
      caveats?: unknown;
    };
  };

  const origin = parseTripPoint(candidate.origin);
  const destination = parseTripPoint(candidate.destination);
  const coordinates = Array.isArray(candidate.pathway?.coordinates)
    ? candidate.pathway.coordinates.filter(isLngLatPair)
    : [];
  if (!origin || !destination || coordinates.length < 2) return null;

  const cells = Array.isArray(candidate.heatmap?.cells)
    ? candidate.heatmap.cells.map(parseHeatmapCell).filter((cell): cell is HeatmapCell => cell != null)
    : [];

  const bboxRaw = candidate.heatmap?.bbox;
  const bbox: [number, number, number, number] =
    Array.isArray(bboxRaw) && bboxRaw.length === 4 && bboxRaw.every((item) => typeof item === 'number')
      ? [bboxRaw[0], bboxRaw[1], bboxRaw[2], bboxRaw[3]]
      : [0, 0, 0, 0];

  const provider =
    candidate.pathway?.provider === 'mapbox' || candidate.pathway?.provider === 'osrm'
      ? candidate.pathway.provider
      : 'mock';

  return {
    origin,
    destination,
    pathway: {
      coordinates,
      distance_meters:
        typeof candidate.pathway?.distance_meters === 'number' ? candidate.pathway.distance_meters : 0,
      duration_seconds:
        typeof candidate.pathway?.duration_seconds === 'number' ? candidate.pathway.duration_seconds : 0,
      provider,
    },
    heatmap: {
      bbox,
      zoom: typeof candidate.heatmap?.zoom === 'number' ? candidate.heatmap.zoom : 12,
      cells,
      normalization:
        typeof candidate.heatmap?.normalization === 'string' ? candidate.heatmap.normalization : '',
      caveats: Array.isArray(candidate.heatmap?.caveats)
        ? candidate.heatmap.caveats.filter((item): item is string => typeof item === 'string')
        : [],
    },
  };
}

export async function createTrip(
  input: CreateTripInput,
  request: typeof apiRequest = apiRequest,
): Promise<TripPlan> {
  const payload = await request<unknown>('/api/v1/trips', {
    method: 'POST',
    body: {
      origin: input.origin,
      destination: input.destination,
      profile: input.profile ?? 'driving',
    },
  });
  const parsed = parseTripResponse(payload);
  if (!parsed) {
    throw new Error('Trip response was invalid');
  }
  return parsed;
}
