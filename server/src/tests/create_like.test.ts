import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { likesTable, postsTable, usersTable } from '../db/schema';
import { type CreateLikeInput } from '../schema';
import { createLike } from '../handlers/create_like';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
};

const testPost = {
  user_id: 1,
  content: 'Test post content',
  media_type: 'text' as const,
  likes_count: 5, // Starting with some likes
};

const testInput: CreateLikeInput = {
  user_id: 1,
  post_id: 1,
};

describe('createLike', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a like successfully', async () => {
    // Create prerequisite user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    const result = await createLike(testInput);

    // Verify like creation
    expect(result.user_id).toEqual(1);
    expect(result.post_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save like to database', async () => {
    // Create prerequisite user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    const result = await createLike(testInput);

    // Verify like exists in database
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.id, result.id))
      .execute();

    expect(likes).toHaveLength(1);
    expect(likes[0].user_id).toEqual(1);
    expect(likes[0].post_id).toEqual(1);
    expect(likes[0].created_at).toBeInstanceOf(Date);
  });

  it('should increment post like count', async () => {
    // Create prerequisite user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    await createLike(testInput);

    // Verify post like count was incremented
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].likes_count).toEqual(6); // 5 + 1
  });

  it('should prevent duplicate likes', async () => {
    // Create prerequisite user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    // Create first like
    await createLike(testInput);

    // Try to create duplicate like
    await expect(createLike(testInput)).rejects.toThrow(/already liked/i);
  });

  it('should fail when user does not exist', async () => {
    // Create post but not user
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    const invalidInput: CreateLikeInput = {
      user_id: 999,
      post_id: 1,
    };

    await expect(createLike(invalidInput)).rejects.toThrow(/user.*not found/i);
  });

  it('should fail when post does not exist', async () => {
    // Create user but not post
    await db.insert(usersTable).values(testUser).execute();

    const invalidInput: CreateLikeInput = {
      user_id: 1,
      post_id: 999,
    };

    await expect(createLike(invalidInput)).rejects.toThrow(/post.*not found/i);
  });

  it('should fail when post is inactive', async () => {
    // Create user and inactive post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values({
      ...testPost,
      is_active: false,
    }).execute();

    await expect(createLike(testInput)).rejects.toThrow(/post.*not found/i);
  });

  it('should maintain data consistency in transaction', async () => {
    // Create prerequisite user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    // Create multiple likes for different users
    const secondUser = {
      username: 'testuser2',
      email: 'test2@example.com',
      password_hash: 'hashed_password2',
      full_name: 'Test User 2',
    };
    await db.insert(usersTable).values(secondUser).execute();

    const firstLike = await createLike({ user_id: 1, post_id: 1 });
    const secondLike = await createLike({ user_id: 2, post_id: 1 });

    // Verify both likes exist
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, 1))
      .execute();

    expect(likes).toHaveLength(2);

    // Verify post like count is correctly updated
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();

    expect(posts[0].likes_count).toEqual(7); // 5 + 2
  });

  it('should handle multiple posts correctly', async () => {
    // Create user and multiple posts
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();
    await db.insert(postsTable).values({
      ...testPost,
      likes_count: 10,
    }).execute();

    // Like both posts
    await createLike({ user_id: 1, post_id: 1 });
    await createLike({ user_id: 1, post_id: 2 });

    // Verify likes exist for both posts
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.user_id, 1))
      .execute();

    expect(likes).toHaveLength(2);
    expect(likes.map(like => like.post_id).sort()).toEqual([1, 2]);

    // Verify each post's like count was incremented correctly
    const posts = await db.select()
      .from(postsTable)
      .execute();

    const post1 = posts.find(p => p.id === 1);
    const post2 = posts.find(p => p.id === 2);

    expect(post1?.likes_count).toEqual(6); // 5 + 1
    expect(post2?.likes_count).toEqual(11); // 10 + 1
  });
});