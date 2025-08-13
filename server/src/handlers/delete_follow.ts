import { db } from '../db';
import { followsTable, usersTable } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const deleteFollow = async (followerId: number, followedId: number): Promise<{ success: boolean }> => {
  try {
    // Use transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // First, verify the follow relationship exists
      const existingFollow = await tx.select()
        .from(followsTable)
        .where(
          and(
            eq(followsTable.follower_id, followerId),
            eq(followsTable.followed_id, followedId)
          )
        )
        .limit(1)
        .execute();

      if (existingFollow.length === 0) {
        return { success: false, notFound: true };
      }

      // Delete the follow relationship
      await tx.delete(followsTable)
        .where(
          and(
            eq(followsTable.follower_id, followerId),
            eq(followsTable.followed_id, followedId)
          )
        )
        .execute();

      // Update follower's following count (decrement)
      await tx.update(usersTable)
        .set({
          following_count: sql`${usersTable.following_count} - 1`,
          updated_at: sql`now()`
        })
        .where(eq(usersTable.id, followerId))
        .execute();

      // Update followed user's followers count (decrement)
      await tx.update(usersTable)
        .set({
          followers_count: sql`${usersTable.followers_count} - 1`,
          updated_at: sql`now()`
        })
        .where(eq(usersTable.id, followedId))
        .execute();

      return { success: true };
    });

    return result.notFound ? { success: false } : result;
  } catch (error) {
    console.error('Delete follow failed:', error);
    throw error;
  }
};