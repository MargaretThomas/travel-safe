const expoPreset = require('jest-expo/jest-preset');

/**
 * `jest-expo/jest-preset` no longer exports `moduleFileExtensions`, so the Jest defaults are
 * listed explicitly instead of spreading from it. `sql` is there because Drizzle's generated
 * migrator imports the migration bundle as a `.sql` file.
 */
const MODULE_FILE_EXTENSIONS = [
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'mts',
  'cts',
  'tsx',
  'json',
  'node',
  'sql',
];

module.exports = {
  ...expoPreset,
  moduleFileExtensions: MODULE_FILE_EXTENSIONS,
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    // Jest cannot parse SQL, so the migrator's bundle import resolves to an inert stand-in.
    '\\.sql$': '<rootDir>/test/sql-module.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
