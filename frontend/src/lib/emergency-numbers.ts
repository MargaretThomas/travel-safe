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

type FetchLike = (
  input: string,
  init?: { method?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export async function fetchEmergencyNumbers(
  apiBaseUrl: string,
  serviceType?: EmergencyServiceType,
  fetchImpl: FetchLike = fetch,
): Promise<EmergencyNumbersResponse> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const query = serviceType
    ? `?service_type=${encodeURIComponent(serviceType)}`
    : '';
  const response = await fetchImpl(
    `${base}/api/v1/emergency-numbers${query}`,
  );

  if (!response.ok) {
    throw new Error(
      `Emergency numbers request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as EmergencyNumbersResponse;
}
