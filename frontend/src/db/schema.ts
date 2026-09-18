import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

export type Users = typeof users.$inferSelect;
