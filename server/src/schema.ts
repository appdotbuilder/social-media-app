import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  full_name: z.string(),
  bio: z.string().nullable(),
  profile_picture_url: z.string().nullable(),
  followers_count: z.number().int(),
  following_count: z.number().int(),
  balance: z.number(),
  is_premium: z.boolean(),
  premium_expires_at: z.coerce.date().nullable(),
  is_admin: z.boolean(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

// Create user input
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1).max(100),
  bio: z.string().max(500).nullable().optional(),
  profile_picture_url: z.string().url().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Update user input
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  profile_picture_url: z.string().url().nullable().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Post schema
export const postSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  content: z.string().nullable(),
  media_urls: z.array(z.string()).nullable(),
  media_type: z.enum(['text', 'photo', 'video', 'link']),
  link_url: z.string().nullable(),
  likes_count: z.number().int(),
  comments_count: z.number().int(),
  shares_count: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Post = z.infer<typeof postSchema>;

// Create post input
export const createPostInputSchema = z.object({
  user_id: z.number(),
  content: z.string().max(2000).nullable().optional(),
  media_urls: z.array(z.string().url()).nullable().optional(),
  media_type: z.enum(['text', 'photo', 'video', 'link']),
  link_url: z.string().url().nullable().optional(),
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Update post input
export const updatePostInputSchema = z.object({
  id: z.number(),
  content: z.string().max(2000).nullable().optional(),
  media_urls: z.array(z.string().url()).nullable().optional(),
  media_type: z.enum(['text', 'photo', 'video', 'link']).optional(),
  link_url: z.string().url().nullable().optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

// Follow relationship schema
export const followSchema = z.object({
  id: z.number(),
  follower_id: z.number(),
  followed_id: z.number(),
  created_at: z.coerce.date(),
});

export type Follow = z.infer<typeof followSchema>;

// Create follow input
export const createFollowInputSchema = z.object({
  follower_id: z.number(),
  followed_id: z.number(),
});

export type CreateFollowInput = z.infer<typeof createFollowInputSchema>;

// Like schema
export const likeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  created_at: z.coerce.date(),
});

export type Like = z.infer<typeof likeSchema>;

// Create like input
export const createLikeInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number(),
});

export type CreateLikeInput = z.infer<typeof createLikeInputSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  content: z.string(),
  likes_count: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Comment = z.infer<typeof commentSchema>;

// Create comment input
export const createCommentInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number(),
  content: z.string().min(1).max(1000),
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Share schema
export const shareSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  created_at: z.coerce.date(),
});

export type Share = z.infer<typeof shareSchema>;

// Create share input
export const createShareInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number(),
});

export type CreateShareInput = z.infer<typeof createShareInputSchema>;

// Premium package schema
export const premiumPackageSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  duration_days: z.number().int(),
  features: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type PremiumPackage = z.infer<typeof premiumPackageSchema>;

// Create premium package input
export const createPremiumPackageInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  price: z.number().positive(),
  duration_days: z.number().int().positive(),
  features: z.array(z.string()),
});

export type CreatePremiumPackageInput = z.infer<typeof createPremiumPackageInputSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: z.enum(['topup', 'purchase', 'refund']),
  amount: z.number(),
  description: z.string(),
  premium_package_id: z.number().nullable(),
  status: z.enum(['pending', 'completed', 'failed']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// Create transaction input
export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  type: z.enum(['topup', 'purchase', 'refund']),
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  premium_package_id: z.number().nullable().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: z.enum(['like', 'comment', 'follow', 'share', 'premium', 'admin']),
  title: z.string(),
  message: z.string(),
  is_read: z.boolean(),
  related_id: z.number().nullable(),
  created_at: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

// Create notification input
export const createNotificationInputSchema = z.object({
  user_id: z.number(),
  type: z.enum(['like', 'comment', 'follow', 'share', 'premium', 'admin']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  related_id: z.number().nullable().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Balance management
export const topUpInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
});

export type TopUpInput = z.infer<typeof topUpInputSchema>;

// Admin dashboard schemas
export const dashboardStatsSchema = z.object({
  total_users: z.number().int(),
  active_users: z.number().int(),
  total_posts: z.number().int(),
  total_transactions: z.number().int(),
  revenue: z.number(),
  premium_users: z.number().int(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Get posts with pagination
export const getPostsInputSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).optional(),
  user_id: z.number().optional(),
});

export type GetPostsInput = z.infer<typeof getPostsInputSchema>;

// Search users input
export const searchUsersInputSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;