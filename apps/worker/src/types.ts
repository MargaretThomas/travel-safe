export interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  check_in_interval_minutes: number | null;
  grace_minutes: number;
  last_check_in_at: string;
  warning_sent_for: string | null;
  triggered_at: string | null;
  trigger_reason: string | null;
  emergency_token: string;
}

export interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  access_token: string | null;
  revoked_at: string | null;
}

export interface EventRow {
  id: string;
  user_id: string;
  reason: "deadman" | "sos";
  created_at: string;
  resolved_at: string | null;
  first_notified_at: string | null;
}

export interface EmailBinding {
  send(message: {
    to: string | { email: string; name?: string };
    from: string | { email: string; name?: string };
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  }): Promise<{ messageId?: string }>;
}

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  WEB_BASE_URL: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  RESEND_API_KEY?: string;
  EMAIL?: EmailBinding;
  PUSH_WEBHOOK_URL?: string;
  CRON_SECRET?: string;
}

export interface NotificationResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}
