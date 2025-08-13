import { db } from '../db';
import { usersTable, postsTable, transactionsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, sum, and, eq, gte } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get total users count
    const totalUsersResult = await db.select({ 
      count: count() 
    })
    .from(usersTable)
    .execute();

    // Get active users count
    const activeUsersResult = await db.select({ 
      count: count() 
    })
    .from(usersTable)
    .where(eq(usersTable.is_active, true))
    .execute();

    // Get total posts count
    const totalPostsResult = await db.select({ 
      count: count() 
    })
    .from(postsTable)
    .where(eq(postsTable.is_active, true))
    .execute();

    // Get total transactions count
    const totalTransactionsResult = await db.select({ 
      count: count() 
    })
    .from(transactionsTable)
    .execute();

    // Get total revenue from completed transactions
    const revenueResult = await db.select({ 
      total: sum(transactionsTable.amount) 
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, 'completed'))
    .execute();

    // Get premium users count (users with is_premium = true and premium not expired)
    const now = new Date();
    const premiumUsersResult = await db.select({ 
      count: count() 
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.is_premium, true),
        gte(usersTable.premium_expires_at, now)
      )
    )
    .execute();

    return {
      total_users: totalUsersResult[0]?.count || 0,
      active_users: activeUsersResult[0]?.count || 0,
      total_posts: totalPostsResult[0]?.count || 0,
      total_transactions: totalTransactionsResult[0]?.count || 0,
      revenue: revenueResult[0]?.total ? parseFloat(revenueResult[0].total) : 0,
      premium_users: premiumUsersResult[0]?.count || 0,
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
};