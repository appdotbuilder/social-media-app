import { db } from '../db';
import { likesTable, postsTable, usersTable } from '../db/schema';
import { type CreateLikeInput, type Like } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const createLike = async (input: CreateLikeInput): Promise<Like> => {
  try {
    // Check if user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if post exists and is active
    const postExists = await db.select({ id: postsTable.id })
      .from(postsTable)
      .where(
        and(
          eq(postsTable.id, input.post_id),
          eq(postsTable.is_active, true)
        )
      )
      .limit(1)
      .execute();

    if (postExists.length === 0) {
      throw new Error(`Active post with id ${input.post_id} not found`);
    }

    // Check if like already exists to prevent duplicates
    const existingLike = await db.select({ id: likesTable.id })
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .limit(1)
      .execute();

    if (existingLike.length > 0) {
      throw new Error(`User ${input.user_id} has already liked post ${input.post_id}`);
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // Create the like
      const likeResult = await tx.insert(likesTable)
        .values({
          user_id: input.user_id,
          post_id: input.post_id,
        })
        .returning()
        .execute();

      // Update the post's like count by incrementing it
      await tx.update(postsTable)
        .set({
          likes_count: sql`${postsTable.likes_count} + 1`,
          updated_at: new Date()
        })
        .where(eq(postsTable.id, input.post_id))
        .execute();

      return likeResult[0];
    });

    return result;
  } catch (error) {
    console.error('Like creation failed:', error);
    throw error;
  }
};