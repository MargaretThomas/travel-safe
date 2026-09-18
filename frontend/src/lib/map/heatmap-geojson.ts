import type { HeatmapCell, TripPathway } from '@/lib/api/trips';
import type { SafetyZone } from '@/lib/safety-map';

export type GeoJsonPointFeature = {
  type: 'Feature';
  id: string;
  properties: { weight: number; id: string };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

export type GeoJsonLineFeature = {
  type: 'Feature';
  properties: { id: string };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
};

export type GeoJsonFeatureCollection<TFeature> = {
  type: 'FeatureCollection';
  features: TFeature[];
};

export function heatmapCellsToGeoJSON(
  cells: readonly HeatmapCell[],
): GeoJsonFeatureCollection<GeoJsonPointFeature> {
  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => ({
      type: 'Feature',
      id: cell.id,
      properties: { id: cell.id, weight: cell.relative_intensity },
      geometry: { type: 'Point', coordinates: [cell.longitude, cell.latitude] },
    })),
  };
}

export function safetyZonesToHeatmapCells(zones: readonly SafetyZone[]): HeatmapCell[] {
  return zones.map((zone) => ({
    id: `zone-${zone.id}`,
    latitude: zone.latitude,
    longitude: zone.longitude,
    label: zone.name,
    reported_crimes: Math.round(((100 - zone.safetyScore) / 100) * 400),
    relative_intensity: Math.min(1, Math.max(0, (100 - zone.safetyScore) / 100)),
    resolution: 'precinct_aggregate',
    source_id: 'local-mock',
  }));
}

export function pathwayToLineGeoJSON(
  pathway: Pick<TripPathway, 'coordinates'>,
  id = 'trip-pathway',
): GeoJsonFeatureCollection<GeoJsonLineFeature> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id },
        geometry: { type: 'LineString', coordinates: pathway.coordinates },
      },
    ],
  };
}

export function lngLatToCoordinate(pair: [number, number]): { latitude: number; longitude: number } {
  return { longitude: pair[0], latitude: pair[1] };
}

export function pathwayCoordinatesToMap(
  coordinates: readonly [number, number][],
): { latitude: number; longitude: number }[] {
  return coordinates.map(lngLatToCoordinate);
}
