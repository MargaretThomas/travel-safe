export interface EmergencyLocation {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  recorded_at: string;
  created_at: string;
}

export interface EmergencySOS {
  id: string;
  kind: "video" | "image" | "audio" | "message";
  message: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
  media_path?: string;
}

export interface EmergencyPayload {
  viewer: { kind: "owner" | "contact"; name: string };
  person: { name: string };
  status: {
    active: boolean;
    reason: "deadman" | "sos" | null;
    since: string | null;
  };
  locations: EmergencyLocation[];
  sos: EmergencySOS[];
  retention_days: number;
  generated_at: string;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getEmergency(token: string, signal?: AbortSignal): Promise<EmergencyPayload> {
  const response = await fetch(apiUrl(`/v1/emergency/${encodeURIComponent(token)}`), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let code = "request_failed";
    let message = "The emergency page could not be loaded.";
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // Keep the fallback copy.
    }
    throw new ApiError(message, response.status, code);
  }
  return (await response.json()) as EmergencyPayload;
}
