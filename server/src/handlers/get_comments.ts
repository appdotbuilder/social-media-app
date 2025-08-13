import { db } from '../db';
import { commentsTable } from '../db/schema';
import { type Comment } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getComments = async (postId: number): Promise<Comment[]> => {
  try {
    // Fetch all active comments for the specific post, ordered by newest first
    const results = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, postId))
      .orderBy(desc(commentsTable.created_at))
      .execute();

    // Convert the results to match the Comment schema
    return results.map(comment => ({
      ...comment,
      // No numeric conversions needed - all fields are already in correct format
    }));
  } catch (error) {
    console.error('Failed to get comments:', error);
    throw error;
  }
};