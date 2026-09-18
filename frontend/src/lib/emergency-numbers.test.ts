import { fetchEmergencyNumbers } from '@/lib/emergency-numbers';

describe('fetchEmergencyNumbers', () => {
  it('requests the backend contract and returns typed numbers', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        region: 'Cape Town / Western Cape demo',
        numbers: [
          {
            id: 'police-saps-10111',
            service_type: 'police',
            display_name: 'South African Police Service Emergency',
            phone_number: '10111',
            coverage_label: 'South Africa',
            source_name: 'South African Police Service',
            source_url: 'https://www.saps.gov.za/services/cc_10111.php',
          },
        ],
      }),
    });

    const result = await fetchEmergencyNumbers(
      'https://api.example.test/',
      'police',
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/emergency-numbers?service_type=police',
    );
    expect(result.numbers[0].phone_number).toBe('10111');
  });

  it('throws on a backend error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(
      fetchEmergencyNumbers('https://api.example.test', undefined, fetchImpl),
    ).rejects.toThrow('status 500');
  });
});
