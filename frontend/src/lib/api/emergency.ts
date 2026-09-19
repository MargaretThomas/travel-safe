import { apiRequest } from '@/lib/api/client';

export type EmergencyServiceType =
  | 'healthcare'
  | 'police'
  | 'fire'
  | 'mountain_rescue';

export type EmergencyNumber = {
  id: string;
  service_type: EmergencyServiceType;
  display_name: string;
  phone_number: string;
  coverage_label: string;
  source_name: string;
  source_url: string;
};

export type EmergencyNumbersResponse = {
  region: string;
  numbers: EmergencyNumber[];
};

export type LocationEmergencyNumber = {
  label: string;
  number: string;
};

export type LocationEmergencyNumbersResponse = {
  in_cape_town: boolean;
  police: LocationEmergencyNumber;
  fire: LocationEmergencyNumber;
  hospital: LocationEmergencyNumber;
};

export type EmergencyService = {
  id: string;
  name: string;
  service_type: EmergencyServiceType;
  latitude: number;
  longitude: number;
  phone_number: string | null;
  source_name: string;
  source_url: string;
  location_note: string | null;
};

export type EmergencyServicesResponse = {
  region: string;
  services: EmergencyService[];
};

export async function fetchEmergencyNumbers(
  serviceType?: EmergencyServiceType,
  request: typeof apiRequest = apiRequest,
): Promise<EmergencyNumbersResponse> {
  const query = serviceType
    ? '?' + new URLSearchParams({ service_type: serviceType }).toString()
    : '';
  return request<EmergencyNumbersResponse>('/api/v1/emergency-numbers' + query);
}

export async function fetchLocationEmergencyNumbers(
  latitude: number,
  longitude: number,
  request: typeof apiRequest = apiRequest,
): Promise<LocationEmergencyNumbersResponse> {
  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  return request<LocationEmergencyNumbersResponse>(
    '/api/v1/emergency/numbers?' + query.toString(),
  );
}

export async function fetchEmergencyServices(
  serviceType?: EmergencyServiceType,
  request: typeof apiRequest = apiRequest,
): Promise<EmergencyServicesResponse> {
  const query = serviceType
    ? '?' + new URLSearchParams({ service_type: serviceType }).toString()
    : '';
  return request<EmergencyServicesResponse>('/api/v1/emergency-services' + query);
}
