import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  json,
  pgEnum,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const mediaTypeEnum = pgEnum('media_type', ['text', 'photo', 'video', 'link']);
export const transactionTypeEnum = pgEnum('transaction_type', ['topup', 'purchase', 'refund']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed']);
export const notificationTypeEnum = pgEnum('notification_type', ['like', 'comment', 'follow', 'share', 'premium', 'admin']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  bio: text('bio'),
  profile_picture_url: text('profile_picture_url'),
  followers_count: integer('followers_count').notNull().default(0),
  following_count: integer('following_count').notNull().default(0),
  balance: numeric('balance', { precision: 10, scale: 2 }).notNull().default('0.00'),
  is_premium: boolean('is_premium').notNull().default(false),
  premium_expires_at: timestamp('premium_expires_at'),
  is_admin: boolean('is_admin').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  usernameIndex: uniqueIndex('users_username_idx').on(table.username),
  emailIndex: uniqueIndex('users_email_idx').on(table.email),
}));

// Posts table
export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  content: text('content'),
  media_urls: json('media_urls').$type<string[]>(),
  media_type: mediaTypeEnum('media_type').notNull().default('text'),
  link_url: text('link_url'),
  likes_count: integer('likes_count').notNull().default(0),
  comments_count: integer('comments_count').notNull().default(0),
  shares_count: integer('shares_count').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Follows table (many-to-many relationship for users)
export const followsTable = pgTable('follows', {
  id: serial('id').primaryKey(),
  follower_id: integer('follower_id').notNull(),
  followed_id: integer('followed_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  followRelationIndex: uniqueIndex('follows_relation_idx').on(table.follower_id, table.followed_id),
}));

// Likes table
export const likesTable = pgTable('likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  post_id: integer('post_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userPostLikeIndex: uniqueIndex('likes_user_post_idx').on(table.user_id, table.post_id),
}));

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  post_id: integer('post_id').notNull(),
  content: text('content').notNull(),
  likes_count: integer('likes_count').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Comment likes table (for liking comments)
export const commentLikesTable = pgTable('comment_likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  comment_id: integer('comment_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCommentLikeIndex: uniqueIndex('comment_likes_user_comment_idx').on(table.user_id, table.comment_id),
}));

// Shares table
export const sharesTable = pgTable('shares', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  post_id: integer('post_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userPostShareIndex: uniqueIndex('shares_user_post_idx').on(table.user_id, table.post_id),
}));

// Premium packages table
export const premiumPackagesTable = pgTable('premium_packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  duration_days: integer('duration_days').notNull(),
  features: json('features').$type<string[]>().notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  premium_package_id: integer('premium_package_id'),
  status: transactionStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  related_id: integer('related_id'), // Can reference posts, users, etc.
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  likes: many(likesTable),
  comments: many(commentsTable),
  commentLikes: many(commentLikesTable),
  shares: many(sharesTable),
  followers: many(followsTable, { relationName: 'followed' }),
  following: many(followsTable, { relationName: 'follower' }),
  transactions: many(transactionsTable),
  notifications: many(notificationsTable),
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [postsTable.user_id],
    references: [usersTable.id],
  }),
  likes: many(likesTable),
  comments: many(commentsTable),
  shares: many(sharesTable),
}));

export const followsRelations = relations(followsTable, ({ one }) => ({
  follower: one(usersTable, {
    fields: [followsTable.follower_id],
    references: [usersTable.id],
    relationName: 'follower',
  }),
  followed: one(usersTable, {
    fields: [followsTable.followed_id],
    references: [usersTable.id],
    relationName: 'followed',
  }),
}));

export const likesRelations = relations(likesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [likesTable.user_id],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [likesTable.post_id],
    references: [postsTable.id],
  }),
}));

export const commentsRelations = relations(commentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [commentsTable.user_id],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [commentsTable.post_id],
    references: [postsTable.id],
  }),
  likes: many(commentLikesTable),
}));

export const commentLikesRelations = relations(commentLikesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [commentLikesTable.user_id],
    references: [usersTable.id],
  }),
  comment: one(commentsTable, {
    fields: [commentLikesTable.comment_id],
    references: [commentsTable.id],
  }),
}));

export const sharesRelations = relations(sharesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sharesTable.user_id],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [sharesTable.post_id],
    references: [postsTable.id],
  }),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id],
  }),
  premiumPackage: one(premiumPackagesTable, {
    fields: [transactionsTable.premium_package_id],
    references: [premiumPackagesTable.id],
  }),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for table operations
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;

export type Follow = typeof followsTable.$inferSelect;
export type NewFollow = typeof followsTable.$inferInsert;

export type Like = typeof likesTable.$inferSelect;
export type NewLike = typeof likesTable.$inferInsert;

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;

export type CommentLike = typeof commentLikesTable.$inferSelect;
export type NewCommentLike = typeof commentLikesTable.$inferInsert;

export type Share = typeof sharesTable.$inferSelect;
export type NewShare = typeof sharesTable.$inferInsert;

export type PremiumPackage = typeof premiumPackagesTable.$inferSelect;
export type NewPremiumPackage = typeof premiumPackagesTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  posts: postsTable,
  follows: followsTable,
  likes: likesTable,
  comments: commentsTable,
  commentLikes: commentLikesTable,
  shares: sharesTable,
  premiumPackages: premiumPackagesTable,
  transactions: transactionsTable,
  notifications: notificationsTable,
};