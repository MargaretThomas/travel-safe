import { renderEmail } from "./email";
import { deadlineFor, emergencyUrl, evaluateDeadman, iso } from "./plan";
import type {
  ContactRow,
  EmailBinding,
  Env,
  EventRow,
  NotificationResult,
  UserRow,
} from "./types";

interface RunSummary {
  ok: boolean;
  ranAt: string;
  warned: number;
  triggered: number;
  eventsNotified: number;
  failures: number;
  cleanedLocations: number;
  prunedRecords: number;
}

export async function run(env: Env, now = new Date()): Promise<RunSummary> {
  const nowIso = iso(now);
  const summary: RunSummary = {
    ok: true,
    ranAt: nowIso,
    warned: 0,
    triggered: 0,
    eventsNotified: 0,
    failures: 0,
    cleanedLocations: 0,
    prunedRecords: 0,
  };

  const cutoff7d = iso(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const cleanup = await env.DB.prepare("DELETE FROM locations WHERE recorded_at < ?")
    .bind(cutoff7d)
    .run();
  summary.cleanedLocations = cleanup.meta.changes ?? 0;

  // Only users whose shortest possible interval could already be overdue are
  // loaded. The decision itself is made in evaluateDeadman.
  const candidateCutoff = iso(new Date(now.getTime() - 15 * 60 * 1000));
  const candidates = await env.DB.prepare(
    `SELECT id, name, email, phone, check_in_interval_minutes, grace_minutes,
            last_check_in_at, warning_sent_for, triggered_at, trigger_reason, emergency_token
     FROM users
     WHERE check_in_interval_minutes IS NOT NULL
       AND check_in_interval_minutes > 0
       AND triggered_at IS NULL
       AND last_check_in_at <= ?
     LIMIT 500`,
  )
    .bind(candidateCutoff)
    .all<UserRow>();

  for (const user of candidates.results ?? []) {
    try {
      const action = evaluateDeadman(user, now);
      if (action === "trigger") {
        await ensureEvent(env, user, "deadman", nowIso);
        summary.triggered++;
      } else if (action === "warn") {
        const sent = await sendWarning(env, user, now, nowIso);
        if (sent.ok) {
          summary.warned++;
        } else {
          summary.failures++;
        }
      }
    } catch (error) {
      console.error("deadman evaluation failed", user.id, error);
      summary.failures++;
    }
  }

  const events = await env.DB.prepare(
    `SELECT id, user_id, reason, created_at, resolved_at, first_notified_at
     FROM emergency_events
     WHERE resolved_at IS NULL AND first_notified_at IS NULL
     ORDER BY created_at ASC
     LIMIT 200`,
  ).all<EventRow>();

  for (const event of events.results ?? []) {
    try {
      const result = await notifyEvent(env, event, nowIso);
      if (result.failures === 0) summary.eventsNotified++;
      summary.failures += result.failures;
    } catch (error) {
      console.error("event notification failed", event.id, error);
      summary.failures++;
    }
  }

  summary.ok = summary.failures === 0;

  // Audit data is useful for a while, not forever. SOS media is deliberately
  // excluded: it is kept until the account is deleted or deletion is requested.
  const cutoff90d = iso(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
  for (const statement of [
    "DELETE FROM check_ins WHERE created_at < ?",
    "DELETE FROM emergency_events WHERE resolved_at IS NOT NULL AND resolved_at < ?",
    "DELETE FROM notifications WHERE created_at < ?",
  ]) {
    const result = await env.DB.prepare(statement).bind(cutoff90d).run();
    summary.prunedRecords += result.meta.changes ?? 0;
  }

  console.log("travel-safe cron", JSON.stringify(summary));
  return summary;
}

async function ensureEvent(
  env: Env,
  user: UserRow,
  reason: "deadman" | "sos",
  nowIso: string,
): Promise<EventRow> {
  const active = await env.DB.prepare(
    `SELECT id, user_id, reason, created_at, resolved_at, first_notified_at
     FROM emergency_events WHERE user_id = ? AND resolved_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(user.id)
    .first<EventRow>();

  await env.DB.prepare(
    `UPDATE users SET triggered_at = COALESCE(triggered_at, ?), trigger_reason = ?,
      warning_sent_for = NULL, updated_at = ? WHERE id = ?`,
  )
    .bind(nowIso, reason, nowIso, user.id)
    .run();

  if (active) return active;

  const event: EventRow = {
    id: crypto.randomUUID(),
    user_id: user.id,
    reason,
    created_at: nowIso,
    resolved_at: null,
    first_notified_at: null,
  };
  await env.DB.prepare(
    `INSERT INTO emergency_events (id, user_id, reason, created_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(event.id, event.user_id, event.reason, event.created_at)
    .run();
  return event;
}

async function sendWarning(
  env: Env,
  user: UserRow,
  now: Date,
  nowIso: string,
): Promise<NotificationResult> {
  const cycle = user.last_check_in_at;
  if (await hasNotification(env, user.id, "", "warning", cycle)) {
    return { ok: true, skipped: true };
  }
  if (!user.email) {
    await logNotification(env, {
      userId: user.id,
      contactId: "",
      kind: "warning",
      cycleKey: cycle,
      recipient: null,
      status: "skipped",
      error: "no_email",
    });
    await markWarned(env, user, nowIso);
    return { ok: true, skipped: true };
  }

  const deadline = deadlineFor(user);
  const web = env.WEB_BASE_URL.replace(/\/+$/, "");
  const content = renderEmail({
    kind: "warning",
    personName: user.name,
    recipientName: user.name,
    link: `${web}/docs#users`,
    webUrl: web,
    lastCheckInAt: user.last_check_in_at,
    intervalMinutes: user.check_in_interval_minutes,
    isContact: false,
  });
  const result = await sendEmail(env, user.email, content);
  if (result.ok) {
    await logNotification(env, {
      userId: user.id,
      contactId: "",
      kind: "warning",
      cycleKey: cycle,
      recipient: user.email,
      status: "sent",
    });
    await markWarned(env, user, nowIso);
  } else {
    console.error("warning email failed", user.id, result.error);
  }
  return result;
}

async function markWarned(env: Env, user: UserRow, nowIso: string) {
  await env.DB.prepare(
    `UPDATE users SET warning_sent_for = ?, updated_at = ?
     WHERE id = ? AND last_check_in_at = ?`,
  )
    .bind(user.last_check_in_at, nowIso, user.id, user.last_check_in_at)
    .run();
}

interface Recipient {
  contactId: string;
  name: string;
  email: string;
  token: string;
  isContact: boolean;
}

async function notifyEvent(
  env: Env,
  event: EventRow,
  nowIso: string,
): Promise<{ failures: number }> {
  const user = await env.DB.prepare(
    `SELECT id, name, email, phone, check_in_interval_minutes, grace_minutes,
            last_check_in_at, warning_sent_for, triggered_at, trigger_reason, emergency_token
     FROM users WHERE id = ?`,
  )
    .bind(event.user_id)
    .first<UserRow>();

  if (!user) {
    await env.DB.prepare(`UPDATE emergency_events SET resolved_at = ?, first_notified_at = ? WHERE id = ?`)
      .bind(nowIso, nowIso, event.id)
      .run();
    return { failures: 0 };
  }

  const contacts = await env.DB.prepare(
    `SELECT id, name, email, phone, access_token, revoked_at FROM contacts
     WHERE user_id = ? AND revoked_at IS NULL AND access_token IS NOT NULL`,
  )
    .bind(user.id)
    .all<ContactRow>();

  const recipients: Recipient[] = [];
  if (user.email) {
    recipients.push({
      contactId: "",
      name: user.name,
      email: user.email,
      token: user.emergency_token,
      isContact: false,
    });
  }
  for (const contact of contacts.results ?? []) {
    if (contact.email && contact.access_token) {
      recipients.push({
        contactId: contact.id,
        name: contact.name,
        email: contact.email,
        token: contact.access_token,
        isContact: true,
      });
    }
  }

  const seen = new Set<string>();
  let failures = 0;
  for (const recipient of recipients) {
    const key = recipient.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (await hasNotification(env, user.id, recipient.contactId, event.reason, event.id)) {
      continue;
    }
    const content = renderEmail({
      kind: event.reason,
      personName: user.name,
      recipientName: recipient.name,
      link: emergencyUrl(env.WEB_BASE_URL, recipient.token),
      webUrl: env.WEB_BASE_URL,
      lastCheckInAt: user.last_check_in_at,
      intervalMinutes: user.check_in_interval_minutes,
      isContact: recipient.isContact,
    });
    const result = await sendEmail(env, recipient.email, content);
    if (result.ok) {
      await logNotification(env, {
        userId: user.id,
        contactId: recipient.contactId,
        kind: event.reason,
        cycleKey: event.id,
        recipient: recipient.email,
        status: "sent",
      });
    } else {
      failures++;
      console.error("event email failed", event.id, recipient.email, result.error);
    }
  }

  if (env.PUSH_WEBHOOK_URL && !(await hasNotification(env, user.id, "", `push_${event.reason}`, event.id))) {
    const linked = emergencyUrl(env.WEB_BASE_URL, user.emergency_token);
    const pushed = await sendPush(env, {
      title: event.reason === "sos" ? `${user.name} sent an SOS` : `${user.name} missed a check-in`,
      message: "Open the private Travel Safe emergency page for their latest location and SOS media.",
      url: linked,
      priority: 5,
    });
    if (pushed.ok) {
      await logNotification(env, {
        userId: user.id,
        contactId: "",
        kind: `push_${event.reason}`,
        cycleKey: event.id,
        recipient: env.PUSH_WEBHOOK_URL,
        status: "sent",
      });
    } else {
      failures++;
    }
  }

  if (recipients.length === 0 && !env.PUSH_WEBHOOK_URL) {
    await logNotification(env, {
      userId: user.id,
      contactId: "",
      kind: event.reason,
      cycleKey: event.id,
      recipient: null,
      status: "skipped",
      error: "no_email_recipients",
    });
  }

  if (failures === 0) {
    await env.DB.prepare(`UPDATE emergency_events SET first_notified_at = ? WHERE id = ? AND first_notified_at IS NULL`)
      .bind(nowIso, event.id)
      .run();
  }
  return { failures };
}

interface LogInput {
  userId: string;
  contactId: string;
  kind: string;
  cycleKey: string;
  recipient: string | null;
  status: "sent" | "skipped" | "failed";
  error?: string;
}

async function logNotification(env: Env, input: LogInput) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO notifications
      (id, user_id, contact_id, kind, cycle_key, recipient, status, error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      input.userId,
      input.contactId,
      input.kind,
      input.cycleKey,
      input.recipient,
      input.status,
      input.error ?? null,
      iso(new Date()),
    )
    .run();
}

async function hasNotification(
  env: Env,
  userId: string,
  contactId: string,
  kind: string,
  cycleKey: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT id FROM notifications
     WHERE user_id = ? AND contact_id = ? AND kind = ? AND cycle_key = ?
       AND status IN ('sent', 'skipped') LIMIT 1`,
  )
    .bind(userId, contactId, kind, cycleKey)
    .first<{ id: string }>();
  return Boolean(row);
}

function parseAddress(value: string): string | { email: string; name: string } {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || "Travel Safe", email: match[2] };
  return value.trim();
}

export async function sendEmail(
  env: Env,
  to: string,
  content: { subject: string; html: string; text: string },
): Promise<NotificationResult> {
  const from = env.EMAIL_FROM?.trim();
  if (!from) return { ok: false, error: "email_from_missing" };

  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: content.subject,
          html: content.html,
          text: content.text,
          ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
        }),
      });
      if (!response.ok) {
        return { ok: false, error: `resend_${response.status}: ${(await response.text()).slice(0, 300)}` };
      }
      const body = (await response.json()) as { id?: string };
      return { ok: true, id: body.id };
    } catch (error) {
      return { ok: false, error: `resend_fetch: ${String(error)}` };
    }
  }

  const binding = env.EMAIL as EmailBinding | undefined;
  if (binding) {
    try {
      const result = await binding.send({
        to,
        from: parseAddress(from),
        subject: content.subject,
        html: content.html,
        text: content.text,
        ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
      });
      return { ok: true, id: result.messageId };
    } catch (error) {
      return { ok: false, error: `cloudflare_email: ${String(error)}` };
    }
  }

  console.warn("email provider not configured; skipping", to, content.subject);
  return { ok: false, error: "email_provider_not_configured" };
}

async function sendPush(
  env: Env,
  payload: { title: string; message: string; url: string; priority: number },
): Promise<NotificationResult> {
  if (!env.PUSH_WEBHOOK_URL) return { ok: false, error: "push_not_configured" };
  try {
    const response = await fetch(env.PUSH_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        tags: ["rotating_light"],
        timestamp: Math.floor(Date.now() / 1000),
      }),
    });
    if (!response.ok) return { ok: false, error: `push_${response.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `push_fetch: ${String(error)}` };
  }
}

function authorized(request: Request, env: Env): boolean {
  if (!env.CRON_SECRET) return false;
  const header = request.headers.get("Authorization") ?? "";
  return header === `Bearer ${env.CRON_SECRET}`;
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env, new Date(controller.scheduledTime)));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        ok: true,
        service: "travel-safe-worker",
        schedule: "0 * * * *",
        environment: env.ENVIRONMENT ?? "unknown",
      });
    }
    if (url.pathname === "/run" && request.method === "POST") {
      if (!authorized(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const summary = await run(env, new Date());
      return Response.json(summary, { status: summary.ok ? 200 : 500 });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

// Referenced only by the type layer; keeps unused imports honest if a
// deployment strips the scheduled handler.
export type { EmailBinding, UserRow };
