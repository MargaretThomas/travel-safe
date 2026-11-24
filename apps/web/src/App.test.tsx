import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "@/App";
import i18n from "@/i18n";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("landing page", () => {
  it("renders the hero, feature copy and API quickstart", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("A safety net");
    expect(heading).toHaveTextContent("that checks on you");

    expect(screen.getByText(/Check in with one tap/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore the API/i })).toHaveAttribute(
      "href",
      "/docs#quickstart",
    );
    expect(screen.getByText("One-tap check-ins")).toBeInTheDocument();
    expect(screen.getByText(/Travel Safe notifies the people you choose/)).toBeInTheDocument();
  });

  it("renders inside a Spanish locale", async () => {
    await i18n.changeLanguage("es");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Una red de seguridad");
    expect(screen.getByRole("link", { name: /Explorar la API/i })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
  });

  it("renders the 404 page for an unknown route", () => {
    render(
      <MemoryRouter initialEntries={["/definitely-not-a-page"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This page wandered off");
  });
});

describe("docs, support and legal pages", () => {
  it("renders the API reference", () => {
    render(
      <MemoryRouter initialEntries={["/docs"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build on Travel Safe");
    expect(screen.getAllByText("Contacts & revocation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/v1/emergency/:token").length).toBeGreaterThan(0);
  });

  it("renders the support page", () => {
    render(
      <MemoryRouter initialEntries={["/support"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How can we help?");
    expect(screen.getByRole("link", { name: /Open GitHub Issues/i })).toHaveAttribute(
      "href",
      "https://github.com/mindsgn/travel-safe/issues/new",
    );
  });

  it("renders the privacy policy", () => {
    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy policy");
    expect(screen.getByText(/7 days, then deleted/)).toBeInTheDocument();
  });

  it("renders the terms", () => {
    render(
      <MemoryRouter initialEntries={["/terms"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Terms of use");
    expect(screen.getByText(/does not replace police, ambulance, fire/i)).toBeInTheDocument();
  });
});
