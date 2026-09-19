import { apiRequest } from '@/lib/api/client';

export type HaloCommunitySignal = {
  rating_enabled: boolean;
  rating_average: number | null;
  rating_count: number;
  like_count: number;
  self_reported_visit_count: number;
  proximity_verified_visit_count: number;
  visitability_score: number | null;
  visitability_confidence: number;
};

export type Halo = {
  id: string;
  name: string;
  description: string;
  location_label: string;
  latitude: number;
  longitude: number;
  source: string;
  caution: string;
  community: HaloCommunitySignal;
};

export type HaloListResponse = {
  items: Halo[];
  count: number;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseHalo(value: unknown): Halo | null {
  if (value == null || typeof value !== 'object') return null;
  const candidate = value as {
    id?: unknown;
    name?: unknown;
    description?: unknown;
    location_label?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    source?: unknown;
    caution?: unknown;
    community?: unknown;
  };
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.location_label !== 'string' ||
    !finiteNumber(candidate.latitude) ||
    !finiteNumber(candidate.longitude) ||
    candidate.community == null ||
    typeof candidate.community !== 'object'
  ) {
    return null;
  }

  const community = candidate.community as Partial<HaloCommunitySignal>;
  if (
    typeof community.rating_enabled !== 'boolean' ||
    !finiteNumber(community.rating_count) ||
    !finiteNumber(community.like_count) ||
    !finiteNumber(community.self_reported_visit_count) ||
    !finiteNumber(community.proximity_verified_visit_count) ||
    !finiteNumber(community.visitability_confidence)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    location_label: candidate.location_label,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    source: typeof candidate.source === 'string' ? candidate.source : 'unknown',
    caution:
      typeof candidate.caution === 'string'
        ? candidate.caution
        : 'Halo visitability does not change the area safety score.',
    community: {
      rating_enabled: community.rating_enabled,
      rating_average: finiteNumber(community.rating_average) ? community.rating_average : null,
      rating_count: Math.max(0, community.rating_count),
      like_count: Math.max(0, community.like_count),
      self_reported_visit_count: Math.max(0, community.self_reported_visit_count),
      proximity_verified_visit_count: Math.max(0, community.proximity_verified_visit_count),
      visitability_score: finiteNumber(community.visitability_score)
        ? Math.min(100, Math.max(0, community.visitability_score))
        : null,
      visitability_confidence: Math.min(1, Math.max(0, community.visitability_confidence)),
    },
  };
}

export async function fetchHaloList(
  request: typeof apiRequest = apiRequest,
): Promise<HaloListResponse> {
  const payload = await request<unknown>('/api/v1/halo');
  if (payload == null || typeof payload !== 'object') {
    throw new Error('Halo response was invalid');
  }
  const candidate = payload as { items?: unknown; count?: unknown };
  if (!Array.isArray(candidate.items)) {
    throw new Error('Halo response was invalid');
  }
  const items = candidate.items.map(parseHalo).filter((item): item is Halo => item != null);
  return {
    items,
    count:
      typeof candidate.count === 'number' && Number.isFinite(candidate.count)
        ? candidate.count
        : items.length,
  };
}
