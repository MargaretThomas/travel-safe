const upstream = require('@expo/metro-config/babel-transformer');
const { transform } = require('./metro.sql-transformer');

jest.mock('@expo/metro-config/babel-transformer', () => ({
  transform: jest.fn(async ({ src, filename }) => ({ src, filename })),
  getCacheKey: jest.fn(() => 'cache-key'),
}));

const SQL = 'CREATE TABLE `app_state` (\n\t`id` integer PRIMARY KEY NOT NULL\n);\n';

describe('metro sql transformer', () => {
  beforeEach(() => {
    upstream.transform.mockClear();
  });

  it('rewrites a sql module into a default string export before Babel parses it', async () => {
    const result = await transform({
      src: SQL,
      filename: '/app/src/drizzle/0000_init.sql',
      options: {},
    });

    expect(upstream.transform).toHaveBeenCalledWith({
      src: `export default ${JSON.stringify(SQL)};`,
      filename: '/app/src/drizzle/0000_init.sql',
      options: {},
    });
    expect(result).toEqual({
      src: `export default ${JSON.stringify(SQL)};`,
      filename: '/app/src/drizzle/0000_init.sql',
    });
  });

  it('leaves javascript modules unchanged', async () => {
    const args = {
      src: 'export const ready = true;\n',
      filename: '/app/src/db/bootstrap.ts',
      options: { dev: true },
    };

    await transform(args);

    expect(upstream.transform).toHaveBeenCalledWith(args);
  });
});
