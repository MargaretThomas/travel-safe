import { render, waitFor } from '@testing-library/react-native';

import App from '../../App';

describe('App', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: 'ok' }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the project name and backend status', async () => {
    const { getByText } = await render(<App />);

    expect(getByText('Travel Safe')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Backend connected')).toBeTruthy();
    });
  });
});
