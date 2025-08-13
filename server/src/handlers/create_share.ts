import { db } from '../db';
import { sharesTable, postsTable, usersTable } from '../db/schema';
import { type CreateShareInput, type Share } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createShare = async (input: CreateShareInput): Promise<Share> => {
  try {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Check if user exists
      const user = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Check if post exists and is active
      const post = await tx.select()
        .from(postsTable)
        .where(and(
          eq(postsTable.id, input.post_id),
          eq(postsTable.is_active, true)
        ))
        .execute();

      if (post.length === 0) {
        throw new Error('Post not found or inactive');
      }

      // Check for duplicate share
      const existingShare = await tx.select()
        .from(sharesTable)
        .where(and(
          eq(sharesTable.user_id, input.user_id),
          eq(sharesTable.post_id, input.post_id)
        ))
        .execute();

      if (existingShare.length > 0) {
        throw new Error('User has already shared this post');
      }

      // Create the share
      const shareResult = await tx.insert(sharesTable)
        .values({
          user_id: input.user_id,
          post_id: input.post_id
        })
        .returning()
        .execute();

      // Update post shares count
      await tx.update(postsTable)
        .set({
          shares_count: post[0].shares_count + 1,
          updated_at: new Date()
        })
        .where(eq(postsTable.id, input.post_id))
        .execute();

      return shareResult[0];
    });
  } catch (error) {
    console.error('Share creation failed:', error);
    throw error;
  }
};