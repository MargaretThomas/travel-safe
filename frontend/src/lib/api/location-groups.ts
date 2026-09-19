import { apiRequest } from '@/lib/api/client';

export type CreateLocationGroupResponse = {
  group_code: string;
  group_key: string;
  created_at: string;
  storage: string;
  warning: string;
};

export type JoinLocationGroupInput = {
  client_id: string;
  display_name: string;
};

export type JoinLocationGroupResponse = JoinLocationGroupInput & {
  group_code: string;
  joined_at: string;
};

export type LocationUpdateInput = {
  latitude: number;
  longitude: number;
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

export async function createLocationGroup(
  request: typeof apiRequest = apiRequest,
): Promise<CreateLocationGroupResponse> {
  return request<CreateLocationGroupResponse>('/api/v1/location-groups', {
    method: 'POST',
  });
}

export async function joinLocationGroup(
  groupCode: string,
  groupKey: string,
  input: JoinLocationGroupInput,
  request: typeof apiRequest = apiRequest,
): Promise<JoinLocationGroupResponse> {
  return request<JoinLocationGroupResponse>(
    '/api/v1/location-groups/' + encodeURIComponent(groupCode) + '/join',
    {
      method: 'POST',
      headers: { 'X-Group-Key': groupKey },
      body: input,
    },
  );
}

export async function updateLocationGroupMember(
  groupCode: string,
  groupKey: string,
  clientId: string,
  input: LocationUpdateInput,
  request: typeof apiRequest = apiRequest,
): Promise<MemberLocation> {
  return request<MemberLocation>(
    '/api/v1/location-groups/' +
      encodeURIComponent(groupCode) +
      '/members/' +
      encodeURIComponent(clientId) +
      '/location',
    {
      method: 'PUT',
      headers: { 'X-Group-Key': groupKey },
      body: input,
    },
  );
}

export async function fetchLocationGroupSnapshot(
  groupCode: string,
  groupKey: string,
  request: typeof apiRequest = apiRequest,
): Promise<LocationGroupSnapshot> {
  return request<LocationGroupSnapshot>(
    '/api/v1/location-groups/' +
      encodeURIComponent(groupCode) +
      '/locations',
    {
      headers: { 'X-Group-Key': groupKey },
    },
  );
}
