/**
 * Jest stand-in for a `.sql` import. Metro inlines the real migration text, which is what
 * `useMigrations` executes on device. Tests never migrate, so an inert value is enough and
 * keeps the import graph loadable without a SQL engine.
 */
module.exports = '';
