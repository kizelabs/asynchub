import { pgTable, varchar, uuid, timestamp, text, index, uniqueIndex, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const workspaces = pgTable('workspaces', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 100 }).notNull(),
	slug: varchar('slug', { length: 50 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [uniqueIndex('workspace_slug_idx').on(t.slug)]);

export const workspaceMembers = pgTable('workspace_members', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
	userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
	role: varchar('role', { length: 20 }).default('member').notNull(),
	joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => [
	index('wm_workspace_idx').on(t.workspaceId),
	index('wm_user_idx').on(t.userId),
	uniqueIndex('wm_unique_membership').on(t.workspaceId, t.userId)
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).default('todo').notNull(), // todo, in_progress, done
  assigneeId: text('assignee_id').references(() => user.id),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Type-safe relations (used for future joins & Drizzle inference)
export const workspacesRelations = relations(workspaces, ({ many }) => ({
	members: many(workspaceMembers),
}));

export const usersRelations = relations(user, ({ many }) => ({
	memberships: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
	workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
	user: one(user, { fields: [workspaceMembers.userId], references: [user.id] }),
}));

// Export TS types for frontend/API usage
export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof user.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, archived, draft
  progress: integer('progress').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export type Project = typeof projects.$inferSelect;
