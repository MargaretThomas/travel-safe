export type CreatedLocationGroup = {
  group_code: string;
  group_key: string;
  created_at: string;
  storage: 'memory_only';
  warning: string;
};

export type JoinedLocationGroup = {
  group_code: string;
  client_id: string;
  display_name: string;
  joined_at: string;
};

export type MemberLocation = {
  client_id: string;
  display_name: string;
  latitude: number;
  longitude: number;
  server_timestamp: string;
  stale: boolean;
};

export type LocationGroupSnapshot = {
  group_code: string;
  members: MemberLocation[];
  server_timestamp: string;
  stale_after_seconds: number;
  polling_interval_seconds: number;
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
    throw new Error(
      `Location group request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

function groupHeaders(groupKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Group-Key': groupKey,
  };
}

export async function createLocationGroup(
  apiBaseUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<CreatedLocationGroup> {
  const response = await fetchImpl(
    endpoint(apiBaseUrl, '/api/v1/location-groups'),
    { method: 'POST' },
  );
  return expectJson<CreatedLocationGroup>(response);
}

export async function joinLocationGroup(
  apiBaseUrl: string,
  groupCode: string,
  groupKey: string,
  clientId: string,
  displayName: string,
  fetchImpl: FetchLike = fetch,
): Promise<JoinedLocationGroup> {
  const response = await fetchImpl(
    endpoint(apiBaseUrl, `/api/v1/location-groups/${groupCode}/join`),
    {
      method: 'POST',
      headers: groupHeaders(groupKey),
      body: JSON.stringify({
        client_id: clientId,
        display_name: displayName,
      }),
    },
  );
  return expectJson<JoinedLocationGroup>(response);
}

export async function publishLocation(
  apiBaseUrl: string,
  groupCode: string,
  groupKey: string,
  clientId: string,
  latitude: number,
  longitude: number,
  fetchImpl: FetchLike = fetch,
): Promise<MemberLocation> {
  const response = await fetchImpl(
    endpoint(
      apiBaseUrl,
      `/api/v1/location-groups/${groupCode}/members/${clientId}/location`,
    ),
    {
      method: 'PUT',
      headers: groupHeaders(groupKey),
      body: JSON.stringify({ latitude, longitude }),
    },
  );
  return expectJson<MemberLocation>(response);
}

export async function fetchGroupLocations(
  apiBaseUrl: string,
  groupCode: string,
  groupKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<LocationGroupSnapshot> {
  const response = await fetchImpl(
    endpoint(
      apiBaseUrl,
      `/api/v1/location-groups/${groupCode}/locations`,
    ),
    {
      method: 'GET',
      headers: { 'X-Group-Key': groupKey },
    },
  );
  return expectJson<LocationGroupSnapshot>(response);
}
