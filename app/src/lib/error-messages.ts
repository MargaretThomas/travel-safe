import { strings } from '@/i18n/strings';
import { ApiError, isNetworkError } from '@/lib/api/client';
import type { ContactErrorCode } from '@/lib/contacts';

const CONTACT_FIELD_CODES: readonly string[] = [
  'missing_name',
  'name_too_long',
  'invalid_email',
  'invalid_phone',
  'missing_channel',
  'whatsapp_requires_phone',
  'phone_required',
  'duplicate_contact',
  'contact_limit',
];

// The backend alerts every phone number over WhatsApp, so these codes cover the test
// alert on any number, not just ones the user marked as WhatsApp.
const PHONE_TEST_CODES = [
  'whatsapp_test_failed',
  'whatsapp_not_configured',
  'whatsapp_not_connected',
] as const;

type PhoneTestCode = (typeof PHONE_TEST_CODES)[number];

export function contactErrorText(
  code: ContactErrorCode | 'phone_required' | 'duplicate_contact' | 'contact_limit',
): string {
  return strings.contacts.form.errors[code];
}

export function phoneTestErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return strings.contacts.form.errors.offline;
  if (error instanceof ApiError && error.code && (PHONE_TEST_CODES as readonly string[]).includes(error.code)) {
    return strings.contacts.form.errors[error.code as PhoneTestCode];
  }
  return strings.contacts.form.errors.whatsapp_test_failed;
}

export function contactSaveErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return strings.contacts.form.errors.offline;
  if (error instanceof ApiError && error.code && CONTACT_FIELD_CODES.includes(error.code)) {
    return contactErrorText(error.code as Parameters<typeof contactErrorText>[0]);
  }
  if (error instanceof ApiError && error.code && (PHONE_TEST_CODES as readonly string[]).includes(error.code)) {
    return phoneTestErrorMessage(error);
  }
  return strings.contacts.form.errors.server;
}

export function intervalErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return strings.settings.interval.offline;
  if (error instanceof ApiError && error.code === 'interval_would_expire') return strings.settings.interval.wouldExpire;
  return strings.settings.interval.failed;
}

export function registrationErrorMessage(error: unknown): string {
  return isNetworkError(error) ? strings.onboarding.name.failedOffline : strings.onboarding.name.failedServer;
}
