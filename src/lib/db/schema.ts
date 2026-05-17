import {
	pgTable,
	varchar,
	uuid,
	timestamp,
	text,
	index,
	uniqueIndex,
	integer,
	boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const workspaces = pgTable(
	'workspaces',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 100 }).notNull(),
		slug: varchar('slug', { length: 50 }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('workspace_slug_idx').on(table.slug)]
);

export const workspaceMembers = pgTable(
	'workspace_members',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		workspaceId: uuid('workspace_id')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: varchar('role', { length: 20 }).default('member').notNull(),
		joinedAt: timestamp('joined_at').defaultNow().notNull()
	},
	(table) => [
		index('wm_workspace_idx').on(table.workspaceId),
		index('wm_user_idx').on(table.userId),
		uniqueIndex('wm_unique_membership').on(table.workspaceId, table.userId)
	]
);

export const projects = pgTable('projects', {
	id: uuid('id').defaultRandom().primaryKey(),
	workspaceId: uuid('workspace_id')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	status: varchar('status', { length: 20 }).default('active').notNull(),
	progress: integer('progress').default(0),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const tasks = pgTable('tasks', {
	id: uuid('id').defaultRandom().primaryKey(),
	workspaceId: uuid('workspace_id')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
	title: varchar('title', { length: 255 }).notNull(),
	status: varchar('status', { length: 20 }).default('todo').notNull(), // todo, in_progress, done
	version: integer('version').default(1).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const taskAssignees = pgTable(
	'task_assignees',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		assignedAt: timestamp('assigned_at').defaultNow().notNull()
	},
	(table) => [
		index('ta_task_idx').on(table.taskId),
		index('ta_user_idx').on(table.userId),
		uniqueIndex('ta_unique_assignment').on(table.taskId, table.userId)
	]
);

export const taskActivityLog = pgTable(
	'task_activity_log',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		action: varchar('action', { length: 50 }).notNull(),
		oldValue: text('old_value'),
		newValue: text('new_value'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('tal_task_idx').on(table.taskId),
		index('tal_user_idx').on(table.userId),
		index('tal_created_idx').on(table.createdAt)
	]
);

export const workspaceInvitations = pgTable(
	'workspace_invitations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		workspaceId: uuid('workspace_id')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		email: varchar('email', { length: 255 }).notNull(),
		token: varchar('token', { length: 255 }).notNull().unique(),
		invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
		expiresAt: timestamp('expires_at').notNull(),
		acceptedAt: timestamp('accepted_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('wi_workspace_idx').on(table.workspaceId),
		index('wi_email_idx').on(table.email),
		index('wi_token_idx').on(table.token),
		uniqueIndex('wi_unique_pending').on(table.workspaceId, table.email)
	]
);

/* **************************** */
export type Task = typeof tasks.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof user.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
	workspaceMemberships: many(workspaceMembers),
	assignedTasks: many(taskAssignees),
	activityLogs: many(taskActivityLog),
	sentInvitations: many(workspaceInvitations)
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
	members: many(workspaceMembers),
	tasks: many(tasks),
	projects: many(projects),
	invitations: many(workspaceInvitations)
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [workspaceMembers.workspaceId],
		references: [workspaces.id]
	}),
	user: one(user, { fields: [workspaceMembers.userId], references: [user.id] })
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
	tasks: many(tasks)
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	workspace: one(workspaces, { fields: [tasks.workspaceId], references: [workspaces.id] }),
	project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
	assignees: many(taskAssignees),
	activityLogs: many(taskActivityLog)
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
	task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
	user: one(user, { fields: [taskAssignees.userId], references: [user.id] })
}));

export const taskActivityLogRelations = relations(taskActivityLog, ({ one }) => ({
	task: one(tasks, { fields: [taskActivityLog.taskId], references: [tasks.id] }),
	user: one(user, { fields: [taskActivityLog.userId], references: [user.id] })
}));

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [workspaceInvitations.workspaceId],
		references: [workspaces.id]
	}),
	invitedBy: one(user, { fields: [workspaceInvitations.invitedBy], references: [user.id] })
}));
