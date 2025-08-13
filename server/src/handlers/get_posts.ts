import { db } from '../db';
import { postsTable } from '../db/schema';
import { type GetPostsInput, type Post } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPosts = async (input?: GetPostsInput): Promise<Post[]> => {
  try {
    // Set defaults for pagination
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    const offset = (page - 1) * limit;

    // Build query conditionally without reassignment to avoid TypeScript issues
    const baseQuery = db.select().from(postsTable);

    // Apply user filter conditionally and execute in one chain
    const results = input?.user_id
      ? await baseQuery
          .where(eq(postsTable.user_id, input.user_id))
          .orderBy(desc(postsTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute()
      : await baseQuery
          .orderBy(desc(postsTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute();

    // Convert numeric fields and return
    return results.map(post => ({
      ...post,
      media_urls: post.media_urls || null, // Ensure null if undefined
    }));
  } catch (error) {
    console.error('Get posts failed:', error);
    throw error;
  }
};