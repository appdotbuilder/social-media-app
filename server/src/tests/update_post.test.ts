import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type UpdatePostInput } from '../schema';
import { updatePost } from '../handlers/update_post';
import { eq } from 'drizzle-orm';

describe('updatePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPostId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: testUserId,
        content: 'Original content',
        media_type: 'text',
        media_urls: null,
        link_url: null
      })
      .returning()
      .execute();

    testPostId = postResult[0].id;
  });

  it('should update post content', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      content: 'Updated content'
    };

    const result = await updatePost(input);

    expect(result.id).toEqual(testPostId);
    expect(result.content).toEqual('Updated content');
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].content).toEqual('Updated content');
  });

  it('should update media URLs and media type', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      media_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      media_type: 'photo'
    };

    const result = await updatePost(input);

    expect(result.media_urls).toEqual(['https://example.com/image1.jpg', 'https://example.com/image2.jpg']);
    expect(result.media_type).toEqual('photo');

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].media_urls).toEqual(['https://example.com/image1.jpg', 'https://example.com/image2.jpg']);
    expect(posts[0].media_type).toEqual('photo');
  });

  it('should update link URL for link type posts', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      link_url: 'https://example.com/article',
      media_type: 'link',
      content: 'Check out this article'
    };

    const result = await updatePost(input);

    expect(result.link_url).toEqual('https://example.com/article');
    expect(result.media_type).toEqual('link');
    expect(result.content).toEqual('Check out this article');

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].link_url).toEqual('https://example.com/article');
    expect(posts[0].media_type).toEqual('link');
  });

  it('should update multiple fields at once', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      content: 'Video post content',
      media_urls: ['https://example.com/video.mp4'],
      media_type: 'video'
    };

    const result = await updatePost(input);

    expect(result.content).toEqual('Video post content');
    expect(result.media_urls).toEqual(['https://example.com/video.mp4']);
    expect(result.media_type).toEqual('video');

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].content).toEqual('Video post content');
    expect(posts[0].media_urls).toEqual(['https://example.com/video.mp4']);
    expect(posts[0].media_type).toEqual('video');
  });

  it('should set fields to null when explicitly provided', async () => {
    // First set post to have media
    await db.update(postsTable)
      .set({
        media_urls: ['https://example.com/existing.jpg'],
        link_url: 'https://example.com/existing'
      })
      .where(eq(postsTable.id, testPostId))
      .execute();

    const input: UpdatePostInput = {
      id: testPostId,
      media_urls: null,
      link_url: null,
      media_type: 'text'
    };

    const result = await updatePost(input);

    expect(result.media_urls).toBeNull();
    expect(result.link_url).toBeNull();
    expect(result.media_type).toEqual('text');

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].media_urls).toBeNull();
    expect(posts[0].link_url).toBeNull();
  });

  it('should preserve unchanged fields', async () => {
    // Get original post data
    const originalPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();
    
    const originalPost = originalPosts[0];

    const input: UpdatePostInput = {
      id: testPostId,
      content: 'Only content changed'
    };

    const result = await updatePost(input);

    expect(result.content).toEqual('Only content changed');
    expect(result.media_type).toEqual(originalPost.media_type);
    expect(result.media_urls).toEqual(originalPost.media_urls);
    expect(result.link_url).toEqual(originalPost.link_url);
    expect(result.likes_count).toEqual(originalPost.likes_count);
    expect(result.comments_count).toEqual(originalPost.comments_count);
    expect(result.shares_count).toEqual(originalPost.shares_count);
  });

  it('should throw error when post does not exist', async () => {
    const input: UpdatePostInput = {
      id: 99999, // Non-existent ID
      content: 'This should fail'
    };

    await expect(updatePost(input)).rejects.toThrow(/post not found/i);
  });

  it('should update the updated_at timestamp', async () => {
    const originalPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();
    
    const originalUpdatedAt = originalPosts[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdatePostInput = {
      id: testPostId,
      content: 'Updated to change timestamp'
    };

    const result = await updatePost(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});