/**
 * Ostinato Database Schema
 * Uses Drizzle ORM with Neon Serverless Postgres
 */
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, index } from 'drizzle-orm/pg-core';

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  plan: text('plan').notNull().default('free'), // 'free' | 'pro' | 'enterprise'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Repositories ─────────────────────────────────────────────────────────────
export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),       // e.g. "owner/repo"
  branch: text('branch').notNull().default('main'),
  webhookSecret: text('webhook_secret').notNull(),
  githubInstallationId: text('github_installation_id'),
  lastSyncedAt: timestamp('last_synced_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('repos_user_idx').on(t.userId),
]);

// ─── Doc Files ────────────────────────────────────────────────────────────────
export const docFiles = pgTable('doc_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),       // e.g. "src/auth/session.ts"
  language: text('language').notNull().default('typescript'),
  rawCode: text('raw_code').notNull(),
  healedMarkdown: text('healed_markdown').notNull().default(''),
  astSnapshot: jsonb('ast_snapshot'),          // Stored AST for diff comparison
  embeddingVector: text('embedding_vector'),   // Serialized float32 array for semantic search
  healCount: integer('heal_count').notNull().default(0),
  lastHealedAt: timestamp('last_healed_at'),
  lastHealedBy: text('last_healed_by'),        // model name
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('docfiles_repo_idx').on(t.repositoryId),
  index('docfiles_path_idx').on(t.filePath),
]);

// ─── Heal Events ──────────────────────────────────────────────────────────────
export const healEvents = pgTable('heal_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  docFileId: uuid('doc_file_id').references(() => docFiles.id, { onDelete: 'set null' }),
  triggerType: text('trigger_type').notNull(), // 'webhook' | 'manual' | 'scheduled'
  commitSha: text('commit_sha'),
  commitMessage: text('commit_message'),
  authorUsername: text('author_username'),
  modifiedFiles: jsonb('modified_files'),      // string[]
  modelUsed: text('model_used'),
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'success' | 'failed'
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('healevents_repo_idx').on(t.repositoryId),
  index('healevents_status_idx').on(t.status),
]);

// ─── Webhook Logs ─────────────────────────────────────────────────────────────
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').references(() => repositories.id, { onDelete: 'set null' }),
  rawPayload: jsonb('raw_payload').notNull(),
  branch: text('branch'),
  commitSha: text('commit_sha'),
  commitMessage: text('commit_message'),
  authorUsername: text('author_username'),
  modifiedFiles: jsonb('modified_files'),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  location: text('location'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('sessions_user_idx').on(t.userId),
  index('sessions_token_idx').on(t.token),
]);

// ─── AI Quota ─────────────────────────────────────────────────────────────────
export const aiQuota = pgTable('ai_quota', {
  id: uuid('id').primaryKey().defaultRandom(),
  fingerprint: text('fingerprint').notNull(),   // SHA-256 of IP+UA+lang+canvas
  userId: text('user_id'),                       // nullable — tracks anon users too
  weekStart: timestamp('week_start').notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  weeklyLimit: integer('weekly_limit').notNull().default(7),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('quota_fp_week_idx').on(t.fingerprint, t.weekStart),
]);

// ─── File Editor State ────────────────────────────────────────────────────────
export const fileEdits = pgTable('file_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').references(() => repositories.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  content: text('content').notNull(),
  commitMessage: text('commit_message'),
  status: text('status').notNull().default('draft'), // 'draft' | 'committed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('fileedits_repo_idx').on(t.repositoryId),
  index('fileedits_user_idx').on(t.userId),
]);

// ─── Security Scans ───────────────────────────────────────────────────────────
export const securityScans = pgTable('security_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  scanPath: text('scan_path').notNull().default('src'),
  findings: jsonb('findings').notNull().default([]),
  summary: jsonb('summary').notNull().default({}),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('scans_user_idx').on(t.userId),
]);

// ─── UI Ratings ───────────────────────────────────────────────────────────────
export const uiRatings = pgTable('ui_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  url: text('url'),
  description: text('description'),
  overallScore: integer('overall_score').notNull(),
  overallGrade: text('overall_grade').notNull(),
  dimensions: jsonb('dimensions').notNull().default([]),
  topStrengths: jsonb('top_strengths').notNull().default([]),
  criticalIssues: jsonb('critical_issues').notNull().default([]),
  quickWins: jsonb('quick_wins').notNull().default([]),
  modelUsed: text('model_used'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('ratings_user_idx').on(t.userId),
]);

// ─── Repository Branches ──────────────────────────────────────────────────────
export const repoBranches = pgTable('repo_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isProtected: boolean('is_protected').notNull().default(false),
  lastCommitSha: text('last_commit_sha'),
  lastCommitMessage: text('last_commit_message'),
  lastCommitAt: timestamp('last_commit_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('branches_repo_idx').on(t.repositoryId),
]);

// ─── Repository Access Tokens ─────────────────────────────────────────────────
export const repoAccessTokens = pgTable('repo_access_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  tokenHash: text('token_hash').notNull(),   // hashed — never store plaintext
  tokenPrefix: text('token_prefix').notNull(), // first 8 chars for display
  scopes: jsonb('scopes').notNull().default([]),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('tokens_repo_idx').on(t.repositoryId),
]);

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Team Members ─────────────────────────────────────────────────────────────
export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('viewer'), // 'owner' | 'editor' | 'viewer'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('members_team_idx').on(t.teamId),
  index('members_user_idx').on(t.userId),
]);

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type DocFile = typeof docFiles.$inferSelect;
export type NewDocFile = typeof docFiles.$inferInsert;
export type HealEvent = typeof healEvents.$inferSelect;
export type NewHealEvent = typeof healEvents.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SecurityScan = typeof securityScans.$inferSelect;
export type UIRating = typeof uiRatings.$inferSelect;
export type RepoBranch = typeof repoBranches.$inferSelect;
export type RepoAccessToken = typeof repoAccessTokens.$inferSelect;
export type AIQuota = typeof aiQuota.$inferSelect;
export type FileEdit = typeof fileEdits.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
