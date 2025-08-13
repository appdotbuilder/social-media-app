import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  searchUsersInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  getPostsInputSchema,
  createLikeInputSchema,
  createCommentInputSchema,
  createShareInputSchema,
  createFollowInputSchema,
  createPremiumPackageInputSchema,
  topUpInputSchema,
  createTransactionInputSchema,
  createNotificationInputSchema,
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { getUserById } from './handlers/get_user_by_id';
import { login } from './handlers/login';
import { searchUsers } from './handlers/search_users';
import { createPost } from './handlers/create_post';
import { getPosts } from './handlers/get_posts';
import { updatePost } from './handlers/update_post';
import { deletePost } from './handlers/delete_post';
import { createLike } from './handlers/create_like';
import { deleteLike } from './handlers/delete_like';
import { createComment } from './handlers/create_comment';
import { getComments } from './handlers/get_comments';
import { createShare } from './handlers/create_share';
import { createFollow } from './handlers/create_follow';
import { deleteFollow } from './handlers/delete_follow';
import { getPremiumPackages } from './handlers/get_premium_packages';
import { createPremiumPackage } from './handlers/create_premium_package';
import { purchasePremium } from './handlers/purchase_premium';
import { topUpBalance } from './handlers/top_up_balance';
import { getTransactions } from './handlers/get_transactions';
import { createNotification } from './handlers/create_notification';
import { getNotifications } from './handlers/get_notifications';
import { markNotificationsRead } from './handlers/mark_notifications_read';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
    
  getUsers: publicProcedure
    .query(() => getUsers()),
    
  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),
    
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
    
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
    
  searchUsers: publicProcedure
    .input(searchUsersInputSchema)
    .query(({ input }) => searchUsers(input)),

  // Post management
  createPost: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => createPost(input)),
    
  getPosts: publicProcedure
    .input(getPostsInputSchema.optional())
    .query(({ input }) => getPosts(input)),
    
  updatePost: publicProcedure
    .input(updatePostInputSchema)
    .mutation(({ input }) => updatePost(input)),
    
  deletePost: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePost(input)),

  // Post interactions
  createLike: publicProcedure
    .input(createLikeInputSchema)
    .mutation(({ input }) => createLike(input)),
    
  deleteLike: publicProcedure
    .input(z.object({ userId: z.number(), postId: z.number() }))
    .mutation(({ input }) => deleteLike(input.userId, input.postId)),
    
  createComment: publicProcedure
    .input(createCommentInputSchema)
    .mutation(({ input }) => createComment(input)),
    
  getComments: publicProcedure
    .input(z.number())
    .query(({ input }) => getComments(input)),
    
  createShare: publicProcedure
    .input(createShareInputSchema)
    .mutation(({ input }) => createShare(input)),

  // Follow system
  createFollow: publicProcedure
    .input(createFollowInputSchema)
    .mutation(({ input }) => createFollow(input)),
    
  deleteFollow: publicProcedure
    .input(z.object({ followerId: z.number(), followedId: z.number() }))
    .mutation(({ input }) => deleteFollow(input.followerId, input.followedId)),

  // Premium packages
  getPremiumPackages: publicProcedure
    .query(() => getPremiumPackages()),
    
  createPremiumPackage: publicProcedure
    .input(createPremiumPackageInputSchema)
    .mutation(({ input }) => createPremiumPackage(input)),
    
  purchasePremium: publicProcedure
    .input(z.object({ userId: z.number(), packageId: z.number() }))
    .mutation(({ input }) => purchasePremium(input.userId, input.packageId)),

  // Balance and transactions
  topUpBalance: publicProcedure
    .input(topUpInputSchema)
    .mutation(({ input }) => topUpBalance(input)),
    
  getTransactions: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getTransactions(input)),

  // Notifications
  createNotification: publicProcedure
    .input(createNotificationInputSchema)
    .mutation(({ input }) => createNotification(input)),
    
  getNotifications: publicProcedure
    .input(z.number())
    .query(({ input }) => getNotifications(input)),
    
  markNotificationsRead: publicProcedure
    .input(z.object({ 
      userId: z.number(), 
      notificationIds: z.array(z.number()).optional() 
    }))
    .mutation(({ input }) => markNotificationsRead(input.userId, input.notificationIds)),

  // Admin dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();