import { db } from '../db';
import { postsTable } from '../db/schema';
import { type UpdatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePost = async (input: UpdatePostInput): Promise<Post> => {
  try {
    // Update the post record
    const result = await db.update(postsTable)
      .set({
        content: input.content,
        media_urls: input.media_urls,
        media_type: input.media_type,
        link_url: input.link_url,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Post not found');
    }

    const post = result[0];
    return {
      ...post,
      // Convert media_urls back to correct type
      media_urls: post.media_urls as string[] | null
    };
  } catch (error) {
    console.error('Post update failed:', error);
    throw error;
  }
};