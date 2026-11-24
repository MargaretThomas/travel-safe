import { describe, expect, it } from "vitest";

import { escapeHtml, renderEmail, type EmailInput } from "./email";

function input(overrides: Partial<EmailInput> = {}): EmailInput {
  return {
    kind: "deadman",
    personName: "Thandi Mokoena",
    recipientName: "Sipho Dlamini",
    link: "https://travel-safe-web.workers.dev/emergency/tok_123",
    webUrl: "https://travel-safe-web.workers.dev",
    lastCheckInAt: "2026-11-23T09:00:00Z",
    intervalMinutes: 1440,
    isContact: true,
    ...overrides,
  };
}

describe("escapeHtml", () => {
  it("escapes the characters that can break out of markup", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;",
    );
  });
});

describe("renderEmail", () => {
  it("builds a complete HTML document with the private link and text fallback", () => {
    const content = renderEmail(input());
    expect(content.html).toContain("<!doctype html>");
    expect(content.html).toContain("https://travel-safe-web.workers.dev/emergency/tok_123");
    expect(content.html).toContain("Open emergency page");
    expect(content.text).toContain("Thandi Mokoena missed a check-in");
    expect(content.text).toContain("https://travel-safe-web.workers.dev/emergency/tok_123");
    expect(content.text).toContain("not an emergency service");
  });

  it("uses an SOS subject and contact-specific copy", () => {
    const contact = renderEmail(input({ kind: "sos", isContact: true }));
    expect(contact.subject).toBe("Travel Safe SOS: Thandi Mokoena needs help");
    expect(contact.text).toContain("You are listed as their emergency contact");

    const owner = renderEmail(input({ kind: "sos", isContact: false }));
    expect(owner.text).toContain("Your private emergency page is ready");
    expect(owner.text).not.toContain("You are listed as their emergency contact");
  });

  it("uses a warning subject without the words dead-man", () => {
    const content = renderEmail(input({ kind: "warning", isContact: false }));
    expect(content.subject).toBe("Travel Safe: check in for Thandi Mokoena");
    expect(content.text).toContain("Check in now");
    expect(content.text).toContain("Their 1 day check-in window has passed");
    expect(content.html).not.toContain("Dead-man switch triggered");
  });

  it("escapes names and links in the HTML body", () => {
    const content = renderEmail(
      input({
        kind: "warning",
        personName: `<script>alert("x")</script>`,
        recipientName: `Sipho & "friends"`,
        link: `https://example.com/?x="><script>alert(1)</script>`,
      }),
    );

    expect(content.html).not.toContain("<script>alert");
    expect(content.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(content.html).toContain("Sipho &amp; &quot;friends&quot;");
    expect(content.html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("falls back to neutral copy when the timestamp or interval is missing", () => {
    const content = renderEmail(
      input({ kind: "warning", lastCheckInAt: "not-a-date", intervalMinutes: null }),
    );
    expect(content.text).toContain("since recently");
    expect(content.text).toContain("the chosen interval check-in window");
  });
});
