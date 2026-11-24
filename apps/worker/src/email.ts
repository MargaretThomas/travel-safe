export type EmailKind = "warning" | "deadman" | "sos";

export interface EmailInput {
  kind: EmailKind;
  personName: string;
  recipientName: string;
  link: string;
  webUrl: string;
  lastCheckInAt?: string;
  intervalMinutes?: number | null;
  isContact: boolean;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatWhen(value?: string): string {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  return `${Math.round((minutes / 60) * 10) / 10} hours`;
}

/**
 * Styled but deliberately plain transactional email. Inline styles are used
 * because many mail clients discard <style> blocks.
 */
export function renderEmail(input: EmailInput): EmailContent {
  const person = input.personName;
  const recipient = input.recipientName;
  const safeLink = escapeHtml(input.link);
  const safeWeb = escapeHtml(input.webUrl);
  const when = formatWhen(input.lastCheckInAt);
  const interval =
    input.intervalMinutes && input.intervalMinutes > 0
      ? humanDuration(input.intervalMinutes)
      : "the chosen interval";

  let eyebrow: string;
  let headline: string;
  let body: string;
  let cta: string;
  let subject: string;

  if (input.kind === "warning") {
    eyebrow = "Check-in overdue";
    headline = `Are you okay, ${recipient}?`;
    subject = `Travel Safe: a check-in is due for ${input.personName}`;
    body = `We haven't received a check-in from ${person} since ${when}. Their ${interval} check-in window has passed. If you are safe, check in now to stop the emergency from triggering.`;
    cta = "Check in now";
  } else if (input.kind === "sos") {
    eyebrow = "SOS received";
    headline = `${person} sent an SOS`;
    subject = `Travel Safe SOS: ${input.personName} needs help`;
    body = input.isContact
      ? `${person} has sent an SOS through Travel Safe. You are listed as their emergency contact. Their latest location, SOS media and 7-day location history are available using the private link below.`
      : `${person} sent an SOS through Travel Safe. Your private emergency page is ready below, with the latest location, SOS media and 7-day location history.`;
    cta = "Open emergency page";
  } else {
    eyebrow = "Dead-man switch triggered";
    headline = `${person} missed a check-in`;
    subject = `Travel Safe alert: ${input.personName} missed a check-in`;
    body = `${person} did not check in within their ${interval} window (last check-in ${when}). Their dead-man switch has triggered. This page shows their latest location, SOS media and 7-day location history.`;
    cta = "Open emergency page";
  }

  if (input.kind === "warning") {
    subject = `Travel Safe: check in for ${input.personName}`;
  }

  return {
    subject,
    text: [
      headline,
      "",
      body,
      "",
      `${cta}: ${input.link}`,
      "",
      `Travel Safe is a safety net, not an emergency service. If someone is in immediate danger, call local emergency services.`,
      `Manage your account: ${input.webUrl}`,
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c2024;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(headline)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e4e2;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:34px;height:34px;border-radius:9px;background:#1f6f5c;color:#ffffff;font-weight:700;text-align:center;font-size:17px;line-height:34px;">✓</td>
            <td style="padding-left:10px;font-size:18px;font-weight:700;color:#1c2024;letter-spacing:-0.02em;">Travel Safe</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 28px 0;">
          <p style="margin:0 0 8px;font-size:12px;line-height:16px;letter-spacing:.09em;text-transform:uppercase;color:#1f6f5c;font-weight:700;">${eyebrow}</p>
          <h1 style="margin:0 0 14px;font-size:28px;line-height:34px;letter-spacing:-0.03em;color:#1c2024;">${escapeHtml(headline)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#5b6068;">${escapeHtml(body)}</p>
          <p style="margin:0 0 26px;">
            <a href="${safeLink}" style="display:inline-block;background:#1f6f5c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:20px;padding:13px 20px;border-radius:10px;">${cta}</a>
          </p>
          <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#5b6068;">If the button does not work, copy this private link into your browser:<br><a href="${safeLink}" style="color:#1f6f5c;word-break:break-all;">${safeLink}</a></p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e1e4e2;background:#fafbfa;">
          <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#5b6068;">Travel Safe is a safety net, not an emergency service. If someone is in immediate danger, call local emergency services.</p>
          <p style="margin:0;font-size:12px;line-height:18px;color:#5b6068;">You received this because you are listed as an emergency contact, or because you own this Travel Safe account. <a href="${safeWeb}" style="color:#1f6f5c;">Manage Travel Safe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
