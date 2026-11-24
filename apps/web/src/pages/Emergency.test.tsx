import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import i18n from "@/i18n";
import type { EmergencyPayload } from "@/lib/api";

const payload: EmergencyPayload = {
  viewer: { kind: "contact", name: "Sipho Dlamini" },
  person: { name: "Thandi Mokoena" },
  status: { active: true, reason: "deadman", since: "2026-11-23T09:00:00Z" },
  locations: [
    {
      id: "loc-2",
      latitude: -33.9249,
      longitude: 18.4241,
      accuracy_m: 12,
      recorded_at: "2026-11-23T09:30:00Z",
      created_at: "2026-11-23T09:30:00Z",
    },
    {
      id: "loc-1",
      latitude: -33.9046,
      longitude: 18.4001,
      accuracy_m: null,
      recorded_at: "2026-11-22T18:00:00Z",
      created_at: "2026-11-22T18:00:00Z",
    },
  ],
  sos: [
    {
      id: "sos-1",
      kind: "message",
      message: "Trail flooded. Heading back to the car park.",
      content_type: null,
      size_bytes: null,
      created_at: "2026-11-23T09:35:00Z",
    },
  ],
  retention_days: 7,
  generated_at: "2026-11-23T10:00:00Z",
};

function mockFetch(handler: () => Promise<unknown>) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => handler());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("emergency viewer", () => {
  it("renders the person, active status, trail and SOS message", async () => {
    const fetchMock = mockFetch(async () => ({ ok: true, status: 200, json: async () => payload }));

    render(
      <MemoryRouter initialEntries={["/emergency/test-token"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Thandi Mokoena")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1/emergency/test-token");

    expect(screen.getAllByText("Emergency active").length).toBeGreaterThan(0);
    expect(screen.getByText("You are viewing this as an emergency contact")).toBeInTheDocument();
    expect(screen.getAllByText("A check-in was missed.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-33.92490, 18.42410").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 m/).length).toBeGreaterThan(0);
    expect(screen.getByText("Trail flooded. Heading back to the car park.")).toBeInTheDocument();
    expect(screen.getByText(/2 points retained for 7 days/)).toBeInTheDocument();
  });

  it("uses the public media route for SOS media", async () => {
    const mediaPayload: EmergencyPayload = {
      ...payload,
      sos: [
        {
          id: "sos-image",
          kind: "image",
          message: null,
          content_type: "image/jpeg",
          size_bytes: 2048,
          created_at: "2026-11-23T09:35:00Z",
          media_path: "/v1/emergency/test-token/media/sos-image",
        },
      ],
    };
    mockFetch(async () => ({ ok: true, status: 200, json: async () => mediaPayload }));

    render(
      <MemoryRouter initialEntries={["/emergency/test-token"]}>
        <App />
      </MemoryRouter>,
    );

    const image = await screen.findByRole("img", { name: "Image" });
    expect(image).toHaveAttribute("src", expect.stringContaining("/v1/emergency/test-token/media/sos-image"));
  });

  it("shows a clear error for a revoked or unknown token", async () => {
    mockFetch(async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: "emergency_link_invalid", message: "This emergency link is not valid." },
      }),
    }));

    render(
      <MemoryRouter initialEntries={["/emergency/revoked"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("This link is not valid")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /Back to Travel Safe/i })).toHaveAttribute("href", "/");
  });

  it("renders the empty states when there is no location or SOS yet", async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...payload, locations: [], sos: [], status: { active: false, reason: null, since: null } }),
    }));

    render(
      <MemoryRouter initialEntries={["/emergency/test-token"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText("Thandi Mokoena");
    expect(screen.getAllByText("No location was shared in the last 7 days.").length).toBeGreaterThan(0);
    expect(
      screen.getByText("No SOS video, audio, image or message has been sent."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No active emergency").length).toBeGreaterThan(0);
  });
});
