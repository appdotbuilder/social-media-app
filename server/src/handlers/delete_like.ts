import { db } from '../db';
import { likesTable, postsTable } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const deleteLike = async (userId: number, postId: number): Promise<{ success: boolean }> => {
  try {
    // Use a transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // First, check if the like exists
      const existingLike = await tx.select()
        .from(likesTable)
        .where(and(
          eq(likesTable.user_id, userId),
          eq(likesTable.post_id, postId)
        ))
        .limit(1)
        .execute();

      if (existingLike.length === 0) {
        return { success: false };
      }

      // Verify the post exists
      const post = await tx.select()
        .from(postsTable)
        .where(eq(postsTable.id, postId))
        .limit(1)
        .execute();

      if (post.length === 0) {
        throw new Error('Post not found');
      }

      // Delete the like
      await tx.delete(likesTable)
        .where(and(
          eq(likesTable.user_id, userId),
          eq(likesTable.post_id, postId)
        ))
        .execute();

      // Decrement the post's likes count (but don't go below 0)
      await tx.update(postsTable)
        .set({
          likes_count: sql`GREATEST(${postsTable.likes_count} - 1, 0)`
        })
        .where(eq(postsTable.id, postId))
        .execute();

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('Delete like failed:', error);
    throw error;
  }
};