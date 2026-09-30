const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
// `.sql` is a source extension so Drizzle can import migrations, but Babel cannot parse SQL.
config.transformer.babelTransformerPath = require.resolve('./metro.sql-transformer.js');
module.exports = config;
