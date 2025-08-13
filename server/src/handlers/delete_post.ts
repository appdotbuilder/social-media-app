import { db } from '../db';
import { postsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deletePost = async (postId: number): Promise<{ success: boolean }> => {
  try {
    // Check if the post exists and is active
    const existingPost = await db.select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.id, postId),
          eq(postsTable.is_active, true)
        )
      )
      .execute();

    if (existingPost.length === 0) {
      throw new Error('Post not found or already deleted');
    }

    // Soft delete by setting is_active to false
    const result = await db.update(postsTable)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, postId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Post deletion failed:', error);
    throw error;
  }
};