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
  created_at: string;
  submitted_by: string | null;
  source: string;
  community: HaloCommunitySignal;
  caution: string;
};

export type HaloListResponse = {
  items: Halo[];
  count: number;
};

export type HaloCreateInput = {
  name: string;
  description: string;
  location_label: string;
  latitude: number;
  longitude: number;
  submitted_by?: string;
  rating_enabled?: boolean;
};

export type HaloRatingInput = {
  rating: number;
  liked: boolean;
  visited: boolean;
  visit_latitude?: number;
  visit_longitude?: number;
};

export type HaloRatingResponse = {
  halo: Halo;
  client_id: string;
  rating: number;
  liked: boolean;
  visited: boolean;
  proximity_verified: boolean;
  updated_at: string;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

function endpoint(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`;
}

async function expectJson<T>(
  response: Awaited<ReturnType<FetchLike>>,
): Promise<T> {
  if (!response.ok) {
    throw new Error(`Halo request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchHalo(
  apiBaseUrl: string,
  options: { query?: string; bbox?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<HaloListResponse> {
  const params = new URLSearchParams();
  if (options.query) params.set('q', options.query);
  if (options.bbox) params.set('bbox', options.bbox);
  const query = params.toString();
  const path = `/api/v1/halo${query ? `?${query}` : ''}`;

  return expectJson<HaloListResponse>(
    await fetchImpl(endpoint(apiBaseUrl, path)),
  );
}

export async function createHalo(
  apiBaseUrl: string,
  clientId: string,
  input: HaloCreateInput,
  fetchImpl: FetchLike = fetch,
): Promise<Halo> {
  return expectJson<Halo>(
    await fetchImpl(endpoint(apiBaseUrl, '/api/v1/halo'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId,
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function rateHalo(
  apiBaseUrl: string,
  clientId: string,
  haloId: string,
  input: HaloRatingInput,
  fetchImpl: FetchLike = fetch,
): Promise<HaloRatingResponse> {
  return expectJson<HaloRatingResponse>(
    await fetchImpl(
      endpoint(apiBaseUrl, `/api/v1/halo/${haloId}/rating`),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': clientId,
        },
        body: JSON.stringify(input),
      },
    ),
  );
}

export async function setHaloRatingEnabled(
  apiBaseUrl: string,
  clientId: string,
  haloId: string,
  enabled: boolean,
  fetchImpl: FetchLike = fetch,
): Promise<Halo> {
  return expectJson<Halo>(
    await fetchImpl(
      endpoint(apiBaseUrl, `/api/v1/halo/${haloId}/rating-settings`),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': clientId,
        },
        body: JSON.stringify({ enabled }),
      },
    ),
  );
}
