import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { deleteLike } from '../handlers/delete_like';
import { eq, and } from 'drizzle-orm';

describe('deleteLike', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPostId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash123',
          full_name: 'Test User',
        },
        {
          username: 'otheruser',
          email: 'other@example.com',
          password_hash: 'hash456',
          full_name: 'Other User',
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test post with initial likes count of 0
    const posts = await db.insert(postsTable)
      .values({
        user_id: testUserId,
        content: 'Test post for likes',
        media_type: 'text',
        likes_count: 0, // Will be updated as we add likes
      })
      .returning()
      .execute();

    testPostId = posts[0].id;
  });

  it('should successfully delete an existing like', async () => {
    // First create a like and update the count
    await db.insert(likesTable)
      .values({
        user_id: testUserId,
        post_id: testPostId,
      })
      .execute();

    // Update post count to reflect the like
    await db.update(postsTable)
      .set({ likes_count: 1 })
      .where(eq(postsTable.id, testPostId))
      .execute();

    const result = await deleteLike(testUserId, testPostId);

    expect(result.success).toBe(true);

    // Verify the like was deleted from database
    const likes = await db.select()
      .from(likesTable)
      .where(and(
        eq(likesTable.user_id, testUserId),
        eq(likesTable.post_id, testPostId)
      ))
      .execute();

    expect(likes).toHaveLength(0);

    // Verify post's like count was decremented
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(post[0].likes_count).toBe(0);
  });

  it('should handle deletion when like count is already at minimum', async () => {
    // Create two likes
    await db.insert(likesTable)
      .values([
        {
          user_id: testUserId,
          post_id: testPostId,
        },
        {
          user_id: otherUserId,
          post_id: testPostId,
        }
      ])
      .execute();

    // Update post to reflect 2 likes
    await db.update(postsTable)
      .set({ likes_count: 2 })
      .where(eq(postsTable.id, testPostId))
      .execute();

    // Delete first like
    const result1 = await deleteLike(testUserId, testPostId);
    expect(result1.success).toBe(true);

    // Verify count decreased to 1
    let post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();
    expect(post[0].likes_count).toBe(1);

    // Delete second like
    const result2 = await deleteLike(otherUserId, testPostId);
    expect(result2.success).toBe(true);

    // Verify count is now 0
    post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();
    expect(post[0].likes_count).toBe(0);

    // Verify both likes were deleted
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, testPostId))
      .execute();

    expect(likes).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent like', async () => {
    // Create one like for reference
    await db.insert(likesTable)
      .values({
        user_id: testUserId,
        post_id: testPostId,
      })
      .execute();

    await db.update(postsTable)
      .set({ likes_count: 1 })
      .where(eq(postsTable.id, testPostId))
      .execute();

    // Try to delete a like that doesn't exist
    const nonExistentUserId = 99999;
    const result = await deleteLike(nonExistentUserId, testPostId);

    expect(result.success).toBe(false);

    // Verify original like is still there
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, testPostId))
      .execute();

    expect(likes).toHaveLength(1);

    // Verify post's like count wasn't affected
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(post[0].likes_count).toBe(1);
  });

  it('should return false when trying to delete like for non-existent post', async () => {
    // Create a like for the existing post first
    await db.insert(likesTable)
      .values({
        user_id: testUserId,
        post_id: testPostId,
      })
      .execute();

    const nonExistentPostId = 99999;
    const result = await deleteLike(testUserId, nonExistentPostId);

    expect(result.success).toBe(false);

    // Verify original like is still intact
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.user_id, testUserId))
      .execute();

    expect(likes).toHaveLength(1);
  });

  it('should throw error when post exists but like references non-existent post in transaction', async () => {
    // Create a like first
    await db.insert(likesTable)
      .values({
        user_id: testUserId,
        post_id: testPostId,
      })
      .execute();

    // Delete the post while keeping the like (simulate data inconsistency)
    await db.delete(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    // Now try to delete the like - should throw error when trying to update non-existent post
    await expect(deleteLike(testUserId, testPostId)).rejects.toThrow(/Post not found/i);

    // Verify the like still exists (transaction rolled back)
    const likes = await db.select()
      .from(likesTable)
      .where(and(
        eq(likesTable.user_id, testUserId),
        eq(likesTable.post_id, testPostId)
      ))
      .execute();

    expect(likes).toHaveLength(1);
  });

  it('should handle multiple sequential deletions correctly', async () => {
    // Create additional users and likes
    const moreUsers = await db.insert(usersTable)
      .values([
        {
          username: 'user3',
          email: 'user3@example.com',
          password_hash: 'hash789',
          full_name: 'User 3',
        },
        {
          username: 'user4',
          email: 'user4@example.com',
          password_hash: 'hash000',
          full_name: 'User 4',
        }
      ])
      .returning()
      .execute();

    // Create 4 likes total
    await db.insert(likesTable)
      .values([
        {
          user_id: testUserId,
          post_id: testPostId,
        },
        {
          user_id: otherUserId,
          post_id: testPostId,
        },
        {
          user_id: moreUsers[0].id,
          post_id: testPostId,
        },
        {
          user_id: moreUsers[1].id,
          post_id: testPostId,
        }
      ])
      .execute();

    // Update post likes count to reflect all likes
    await db.update(postsTable)
      .set({ likes_count: 4 })
      .where(eq(postsTable.id, testPostId))
      .execute();

    // Delete likes one by one
    const result1 = await deleteLike(testUserId, testPostId);
    expect(result1.success).toBe(true);

    const result2 = await deleteLike(otherUserId, testPostId);
    expect(result2.success).toBe(true);

    const result3 = await deleteLike(moreUsers[0].id, testPostId);
    expect(result3.success).toBe(true);

    const result4 = await deleteLike(moreUsers[1].id, testPostId);
    expect(result4.success).toBe(true);

    // Verify all likes were deleted
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, testPostId))
      .execute();

    expect(likes).toHaveLength(0);

    // Verify final count is 0
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(post[0].likes_count).toBe(0);
  });

  it('should not go below zero when like count is already 0', async () => {
    // Create a like but manually set post count to 0 (edge case)
    await db.insert(likesTable)
      .values({
        user_id: testUserId,
        post_id: testPostId,
      })
      .execute();

    // Keep post count at 0 (simulating inconsistent state)
    await db.update(postsTable)
      .set({ likes_count: 0 })
      .where(eq(postsTable.id, testPostId))
      .execute();

    const result = await deleteLike(testUserId, testPostId);

    expect(result.success).toBe(true);

    // Verify the like was deleted
    const likes = await db.select()
      .from(likesTable)
      .where(and(
        eq(likesTable.user_id, testUserId),
        eq(likesTable.post_id, testPostId)
      ))
      .execute();

    expect(likes).toHaveLength(0);

    // Verify count stays at 0 (doesn't go negative)
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(post[0].likes_count).toBe(0);
  });
});