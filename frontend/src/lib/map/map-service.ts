import type { MapCoordinate, MapRegion } from './map.types';
import { isValidCoordinate } from './coordinates';
import { regionForCamera, zoomForLatitudeDelta, DEFAULT_LATITUDE_DELTA } from './regions';

export type NativeMapHandle = {
  animateToRegion?: (region: MapRegion, durationMs?: number) => void;
  animateCamera?: (camera: { center: MapCoordinate; zoom: number }, options?: { duration?: number }) => void;
  getCamera?: () => Promise<{ center: MapCoordinate; zoom?: number } | undefined | null>;
  fitToCoordinates?: (
    coordinates: MapCoordinate[],
    options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean },
  ) => void;
};

export type MapCommandResult = 'ok' | 'unavailable';

export type FitToOptions = {
  edgePadding?: { top: number; right: number; bottom: number; left: number };
  animated?: boolean;
};

export type MapController = {
  animateToRegion(region: MapRegion, durationMs?: number): MapCommandResult;
  recenter(coordinate: MapCoordinate, region: MapRegion, durationMs?: number): MapCommandResult;
  zoomBy(anchor: MapCoordinate, deltaZoom: number, durationMs?: number): Promise<MapCommandResult>;
  fitToCoordinates(coordinates: readonly MapCoordinate[], options?: FitToOptions): MapCommandResult;
};

export type MapControllerFactory = (handle: NativeMapHandle | null | undefined) => MapController;

export const createMapController: MapControllerFactory = (handle) => ({
  animateToRegion(region, durationMs = 300) {
    if (!handle?.animateToRegion) return 'unavailable';
    handle.animateToRegion({ ...region }, durationMs);
    return 'ok';
  },

  recenter(coordinate, region, durationMs = 300) {
    return this.animateToRegion({ ...region, latitude: coordinate.latitude, longitude: coordinate.longitude }, durationMs);
  },

  async zoomBy(anchor, deltaZoom, durationMs = 300) {
    let currentZoom: number | null = null;
    if (handle?.getCamera) {
      try {
        const camera = await handle.getCamera();
        currentZoom = camera?.zoom ?? null;
      } catch {
        currentZoom = null;
      }
    }
    const baseZoom = currentZoom ?? zoomForLatitudeDelta(DEFAULT_LATITUDE_DELTA);
    return this.animateToRegion(regionForCamera({ center: anchor, zoom: baseZoom + deltaZoom }), durationMs);
  },

  fitToCoordinates(coordinates, options) {
    if (!handle?.fitToCoordinates) return 'unavailable';
    const points = coordinates.filter((coordinate) => isValidCoordinate(coordinate));
    if (points.length === 0) return 'unavailable';
    handle.fitToCoordinates(points, { ...options, animated: true });
    return 'ok';
  },
});