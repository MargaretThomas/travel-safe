const upstream = require('@expo/metro-config/babel-transformer');

/**
 * Drizzle's migrator imports generated `.sql` files. Metro treats those as source modules,
 * so Babel would parse the SQL as JavaScript. Rewrite each file to a string export first.
 */
async function transform(args) {
  if (args.filename.endsWith('.sql')) {
    return upstream.transform({
      ...args,
      src: `export default ${JSON.stringify(args.src)};`,
    });
  }
  return upstream.transform(args);
}

module.exports = {
  transform,
  getCacheKey: upstream.getCacheKey,
};
