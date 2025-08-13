import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sharesTable, postsTable, usersTable } from '../db/schema';
import { type CreateShareInput } from '../schema';
import { createShare } from '../handlers/create_share';
import { eq, and } from 'drizzle-orm';
// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  full_name: 'Test User',
  bio: 'Test bio',
  profile_picture_url: 'https://example.com/avatar.jpg'
};

const testPost = {
  content: 'Test post content',
  media_type: 'text' as const,
  media_urls: ['https://example.com/image.jpg'],
  link_url: 'https://example.com'
};

describe('createShare', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a share successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: postId
    };

    const result = await createShare(input);

    // Verify share creation
    expect(result.user_id).toEqual(userId);
    expect(result.post_id).toEqual(postId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update post shares count', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;
    const initialSharesCount = postResult[0].shares_count;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: postId
    };

    await createShare(input);

    // Verify post shares count was updated
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPost[0].shares_count).toEqual(initialSharesCount + 1);
    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save share to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: postId
    };

    const result = await createShare(input);

    // Verify share was saved to database
    const shares = await db.select()
      .from(sharesTable)
      .where(eq(sharesTable.id, result.id))
      .execute();

    expect(shares).toHaveLength(1);
    expect(shares[0].user_id).toEqual(userId);
    expect(shares[0].post_id).toEqual(postId);
    expect(shares[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate shares', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: postId
    };

    // Create first share
    await createShare(input);

    // Attempt to create duplicate share
    expect(createShare(input)).rejects.toThrow(/already shared/i);

    // Verify only one share exists
    const shares = await db.select()
      .from(sharesTable)
      .where(and(
        eq(sharesTable.user_id, userId),
        eq(sharesTable.post_id, postId)
      ))
      .execute();

    expect(shares).toHaveLength(1);
  });

  it('should throw error when user does not exist', async () => {
    // Create test user for post
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    const input: CreateShareInput = {
      user_id: 99999, // Non-existent user
      post_id: postId
    };

    expect(createShare(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when post does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: 99999 // Non-existent post
    };

    expect(createShare(input)).rejects.toThrow(/post not found/i);
  });

  it('should throw error when post is inactive', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create inactive post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId,
        is_active: false
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: postId
    };

    expect(createShare(input)).rejects.toThrow(/post not found or inactive/i);
  });

  it('should handle transaction rollback on error', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;
    const initialSharesCount = postResult[0].shares_count;

    const input: CreateShareInput = {
      user_id: userId,
      post_id: postId
    };

    // Create first share
    await createShare(input);

    // Attempt duplicate share (should fail)
    try {
      await createShare(input);
    } catch (error) {
      // Expected error
    }

    // Verify post shares count wasn't incremented by failed transaction
    const finalPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(finalPost[0].shares_count).toEqual(initialSharesCount + 1); // Only one increment

    // Verify only one share exists
    const shares = await db.select()
      .from(sharesTable)
      .where(and(
        eq(sharesTable.user_id, userId),
        eq(sharesTable.post_id, postId)
      ))
      .execute();

    expect(shares).toHaveLength(1);
  });
});