import { ApiError, NetworkError } from './api/client';
import {
  contactErrorText,
  contactSaveErrorMessage,
  intervalErrorMessage,
  phoneTestErrorMessage,
  registrationErrorMessage,
} from './error-messages';

describe('error messages', () => {
  it('maps contact save errors', () => {
    expect(contactSaveErrorMessage(new NetworkError())).toContain('offline');
    expect(contactSaveErrorMessage(new ApiError('x', 409, 'duplicate_contact'))).toBe(
      contactErrorText('duplicate_contact'),
    );
    expect(contactSaveErrorMessage(new ApiError('x', 422, 'invalid_phone'))).toBe(contactErrorText('invalid_phone'));
    expect(contactSaveErrorMessage(new ApiError('x', 422, 'phone_required'))).toBe(
      contactErrorText('phone_required'),
    );
    expect(contactSaveErrorMessage(new ApiError('x', 500, 'boom'))).toBe('We couldn’t save this contact. Please try again.');
  });

  it('maps test alert failures', () => {
    expect(contactSaveErrorMessage(new ApiError('x', 503, 'whatsapp_test_failed'))).toContain('Check the number');
    expect(contactSaveErrorMessage(new ApiError('x', 503, 'whatsapp_not_configured'))).toBe(
      phoneTestErrorMessage(new ApiError('x', 503, 'whatsapp_not_configured')),
    );
    expect(contactSaveErrorMessage(new ApiError('x', 503, 'whatsapp_not_connected'))).toContain('test alert failed');
    expect(phoneTestErrorMessage(new NetworkError())).toContain('offline');
    expect(phoneTestErrorMessage(new ApiError('x', 500, 'boom'))).toContain('Check the number');
  });

  it('maps interval errors', () => {
    expect(intervalErrorMessage(new ApiError('x', 409, 'interval_would_expire'))).toContain('in the past');
    expect(intervalErrorMessage(new NetworkError())).toContain('offline');
    expect(intervalErrorMessage(new Error('x'))).toContain('couldn’t save');
  });

  it('maps registration errors', () => {
    expect(registrationErrorMessage(new NetworkError())).toContain('offline');
    expect(registrationErrorMessage(new ApiError('x', 503))).toContain('try again');
  });
});
