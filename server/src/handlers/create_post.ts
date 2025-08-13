import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const createPost = async (input: CreatePostInput): Promise<Post> => {
  try {
    // Verify that the user exists before creating the post
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // Insert post record
    const result = await db.insert(postsTable)
      .values({
        user_id: input.user_id,
        content: input.content || null,
        media_urls: input.media_urls || null,
        media_type: input.media_type,
        link_url: input.link_url || null,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        is_active: true,
      })
      .returning()
      .execute();

    const post = result[0];
    return {
      ...post,
      // Convert JSON arrays back to proper arrays for media_urls if they exist
      media_urls: post.media_urls as string[] | null,
    };
  } catch (error) {
    console.error('Post creation failed:', error);
    throw error;
  }
};