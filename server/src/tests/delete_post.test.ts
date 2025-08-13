import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { deletePost } from '../handlers/delete_post';
import { eq } from 'drizzle-orm';

describe('deletePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete an active post', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        bio: null,
        profile_picture_url: null,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Test post content',
        media_urls: null,
        media_type: 'text',
        link_url: null,
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Verify post is active initially
    expect(postResult[0].is_active).toBe(true);

    // Delete the post
    const result = await deletePost(postId);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify post is soft deleted in database
    const deletedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(deletedPost).toHaveLength(1);
    expect(deletedPost[0].is_active).toBe(false);
    expect(deletedPost[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp when deleting', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User 2',
        bio: null,
        profile_picture_url: null,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Test post content',
        media_urls: null,
        media_type: 'text',
        link_url: null,
      })
      .returning()
      .execute();

    const postId = postResult[0].id;
    const originalUpdatedAt = postResult[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Delete the post
    await deletePost(postId);

    // Verify updated_at was changed
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
    expect(updatedPost[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when post does not exist', async () => {
    const nonExistentPostId = 99999;

    await expect(deletePost(nonExistentPostId))
      .rejects
      .toThrow(/post not found or already deleted/i);
  });

  it('should throw error when post is already deleted', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        email: 'test3@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User 3',
        bio: null,
        profile_picture_url: null,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test post that is already inactive
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Already deleted post',
        media_urls: null,
        media_type: 'text',
        link_url: null,
        is_active: false,
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Try to delete already inactive post
    await expect(deletePost(postId))
      .rejects
      .toThrow(/post not found or already deleted/i);
  });

  it('should handle posts with different media types', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser4',
        email: 'test4@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User 4',
        bio: null,
        profile_picture_url: null,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create photo post
    const photoPostResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Photo post',
        media_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        media_type: 'photo',
        link_url: null,
      })
      .returning()
      .execute();

    // Create video post
    const videoPostResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Video post',
        media_urls: ['https://example.com/video1.mp4'],
        media_type: 'video',
        link_url: null,
      })
      .returning()
      .execute();

    // Create link post
    const linkPostResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Link post',
        media_urls: null,
        media_type: 'link',
        link_url: 'https://example.com',
      })
      .returning()
      .execute();

    // Delete all posts
    await deletePost(photoPostResult[0].id);
    await deletePost(videoPostResult[0].id);
    await deletePost(linkPostResult[0].id);

    // Verify all posts are soft deleted
    const deletedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.user_id, userId))
      .execute();

    expect(deletedPosts).toHaveLength(3);
    deletedPosts.forEach(post => {
      expect(post.is_active).toBe(false);
    });
  });

  it('should handle posts with engagement counts', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser5',
        email: 'test5@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User 5',
        bio: null,
        profile_picture_url: null,
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create post with engagement counts
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Popular post',
        media_urls: null,
        media_type: 'text',
        link_url: null,
        likes_count: 100,
        comments_count: 50,
        shares_count: 25,
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Delete the post
    const result = await deletePost(postId);

    expect(result.success).toBe(true);

    // Verify post is deleted but engagement counts are preserved
    const deletedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(deletedPost[0].is_active).toBe(false);
    expect(deletedPost[0].likes_count).toBe(100);
    expect(deletedPost[0].comments_count).toBe(50);
    expect(deletedPost[0].shares_count).toBe(25);
  });
});