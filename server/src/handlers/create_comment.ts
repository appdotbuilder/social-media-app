import { db } from '../db';
import { commentsTable, postsTable, usersTable } from '../db/schema';
import { type CreateCommentInput, type Comment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createComment = async (input: CreateCommentInput): Promise<Comment> => {
  try {
    // Begin transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // Verify that the user exists and is active
      const user = await tx.select()
        .from(usersTable)
        .where(and(eq(usersTable.id, input.user_id), eq(usersTable.is_active, true)))
        .execute();

      if (user.length === 0) {
        throw new Error('User not found or inactive');
      }

      // Verify that the post exists and is active
      const post = await tx.select()
        .from(postsTable)
        .where(and(eq(postsTable.id, input.post_id), eq(postsTable.is_active, true)))
        .execute();

      if (post.length === 0) {
        throw new Error('Post not found or inactive');
      }

      // Create the comment
      const commentResult = await tx.insert(commentsTable)
        .values({
          user_id: input.user_id,
          post_id: input.post_id,
          content: input.content,
        })
        .returning()
        .execute();

      // Update the post's comment count
      await tx.update(postsTable)
        .set({ 
          comments_count: post[0].comments_count + 1,
          updated_at: new Date()
        })
        .where(eq(postsTable.id, input.post_id))
        .execute();

      return commentResult[0];
    });

    // Return the comment with numeric conversions applied
    return {
      ...result,
      // No numeric conversions needed for comments table - all fields are proper types
    };
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
};