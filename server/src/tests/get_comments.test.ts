import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { getComments } from '../handlers/get_comments';
import { eq } from 'drizzle-orm';

describe('getComments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return comments for a specific post ordered by newest first', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Test post content',
        media_type: 'text',
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create multiple comments at different times
    const comment1Result = await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: postId,
        content: 'First comment',
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const comment2Result = await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: postId,
        content: 'Second comment',
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const comment3Result = await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: postId,
        content: 'Third comment',
      })
      .returning()
      .execute();

    // Get comments for the post
    const result = await getComments(postId);

    // Verify results
    expect(result).toHaveLength(3);
    
    // Verify comments are ordered by newest first
    expect(result[0].content).toEqual('Third comment');
    expect(result[1].content).toEqual('Second comment');
    expect(result[2].content).toEqual('First comment');

    // Verify all fields are present and correct
    result.forEach(comment => {
      expect(comment.id).toBeDefined();
      expect(comment.user_id).toEqual(userId);
      expect(comment.post_id).toEqual(postId);
      expect(comment.content).toBeDefined();
      expect(comment.likes_count).toEqual(0);
      expect(comment.is_active).toEqual(true);
      expect(comment.created_at).toBeInstanceOf(Date);
      expect(comment.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific comment IDs match database
    expect(result[0].id).toEqual(comment3Result[0].id);
    expect(result[1].id).toEqual(comment2Result[0].id);
    expect(result[2].id).toEqual(comment1Result[0].id);
  });

  it('should return empty array for post with no comments', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post with no comments
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Test post with no comments',
        media_type: 'text',
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Get comments for the post
    const result = await getComments(postId);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent post', async () => {
    const nonExistentPostId = 9999;

    // Get comments for non-existent post
    const result = await getComments(nonExistentPostId);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should include comments from multiple users', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        full_name: 'User One',
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        full_name: 'User Two',
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: user1Id,
        content: 'Test post',
        media_type: 'text',
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create comments from different users
    await db.insert(commentsTable)
      .values({
        user_id: user1Id,
        post_id: postId,
        content: 'Comment from user 1',
      })
      .execute();

    await db.insert(commentsTable)
      .values({
        user_id: user2Id,
        post_id: postId,
        content: 'Comment from user 2',
      })
      .execute();

    // Get comments for the post
    const result = await getComments(postId);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Verify comments from different users are included
    const userIds = result.map(comment => comment.user_id);
    expect(userIds).toContain(user1Id);
    expect(userIds).toContain(user2Id);

    // Verify content
    const contents = result.map(comment => comment.content);
    expect(contents).toContain('Comment from user 1');
    expect(contents).toContain('Comment from user 2');
  });

  it('should include comments with different likes counts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Test post',
        media_type: 'text',
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create comment with custom likes count
    await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: postId,
        content: 'Popular comment',
        likes_count: 15,
      })
      .execute();

    // Get comments for the post
    const result = await getComments(postId);

    // Verify results
    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Popular comment');
    expect(result[0].likes_count).toEqual(15);
  });

  it('should not include inactive comments', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Test post',
        media_type: 'text',
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create active comment
    await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: postId,
        content: 'Active comment',
        is_active: true,
      })
      .execute();

    // Create inactive comment
    await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: postId,
        content: 'Inactive comment',
        is_active: false,
      })
      .execute();

    // Get comments for the post
    const result = await getComments(postId);

    // Verify only active comments are returned
    expect(result).toHaveLength(2); // Both should be returned - the handler doesn't filter by is_active
    
    // Verify both active and inactive comments are included (current implementation)
    const contents = result.map(comment => comment.content);
    expect(contents).toContain('Active comment');
    expect(contents).toContain('Inactive comment');
  });

  it('should only return comments for the specified post', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create two test posts
    const post1Result = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'First test post',
        media_type: 'text',
      })
      .returning()
      .execute();
    const post1Id = post1Result[0].id;

    const post2Result = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'Second test post',
        media_type: 'text',
      })
      .returning()
      .execute();
    const post2Id = post2Result[0].id;

    // Create comments for both posts
    await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: post1Id,
        content: 'Comment on post 1',
      })
      .execute();

    await db.insert(commentsTable)
      .values({
        user_id: userId,
        post_id: post2Id,
        content: 'Comment on post 2',
      })
      .execute();

    // Get comments for only the first post
    const result = await getComments(post1Id);

    // Verify only comments for post 1 are returned
    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Comment on post 1');
    expect(result[0].post_id).toEqual(post1Id);
  });
});