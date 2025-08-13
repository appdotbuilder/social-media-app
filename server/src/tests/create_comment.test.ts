import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type CreateCommentInput } from '../schema';
import { createComment } from '../handlers/create_comment';
import { eq } from 'drizzle-orm';


// Test input with complete data
const testInput: CreateCommentInput = {
  user_id: 1,
  post_id: 1,
  content: 'This is a test comment with meaningful content'
};

describe('createComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        bio: 'Test bio',
        balance: '100.00',
      })
      .returning()
      .execute();
    
    return result[0];
  };

  // Helper function to create test post
  const createTestPost = async (userId: number) => {
    const result = await db.insert(postsTable)
      .values({
        user_id: userId,
        content: 'This is a test post',
        media_type: 'text',
        comments_count: 0,
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should create a comment successfully', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id
    };

    const result = await createComment(input);

    // Validate comment fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.post_id).toEqual(post.id);
    expect(result.content).toEqual('This is a test comment with meaningful content');
    expect(result.likes_count).toEqual(0);
    expect(result.is_active).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id
    };

    const result = await createComment(input);

    // Verify comment was saved to database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].user_id).toEqual(user.id);
    expect(comments[0].post_id).toEqual(post.id);
    expect(comments[0].content).toEqual(input.content);
    expect(comments[0].likes_count).toEqual(0);
    expect(comments[0].is_active).toEqual(true);
  });

  it('should increment post comment count', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id
    };

    // Verify initial comment count
    expect(post.comments_count).toEqual(0);

    await createComment(input);

    // Check that post comment count was incremented
    const updatedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(updatedPosts).toHaveLength(1);
    expect(updatedPosts[0].comments_count).toEqual(1);
    expect(updatedPosts[0].updated_at).toBeInstanceOf(Date);
    expect(updatedPosts[0].updated_at > post.updated_at).toBe(true);
  });

  it('should handle multiple comments on same post', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id
    };

    // Create first comment
    await createComment(input);

    // Create second comment
    const secondComment = await createComment({
      ...input,
      content: 'Second comment'
    });

    // Verify both comments exist
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, post.id))
      .execute();

    expect(comments).toHaveLength(2);

    // Verify post comment count is correct
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(updatedPost[0].comments_count).toEqual(2);
  });

  it('should throw error for non-existent user', async () => {
    // Create only a post, no user
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    const input = {
      ...testInput,
      user_id: 99999, // Non-existent user ID
      post_id: post.id
    };

    await expect(createComment(input)).rejects.toThrow(/user not found or inactive/i);
  });

  it('should throw error for inactive user', async () => {
    // Create user and post
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    // Deactivate the user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, user.id))
      .execute();
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id
    };

    await expect(createComment(input)).rejects.toThrow(/user not found or inactive/i);
  });

  it('should throw error for non-existent post', async () => {
    // Create only a user, no post
    const user = await createTestUser();
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: 99999 // Non-existent post ID
    };

    await expect(createComment(input)).rejects.toThrow(/post not found or inactive/i);
  });

  it('should throw error for inactive post', async () => {
    // Create user and post
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    // Deactivate the post
    await db.update(postsTable)
      .set({ is_active: false })
      .where(eq(postsTable.id, post.id))
      .execute();
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id
    };

    await expect(createComment(input)).rejects.toThrow(/post not found or inactive/i);
  });

  it('should handle long comment content', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    
    const longContent = 'A'.repeat(1000); // Maximum length allowed by schema
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: post.id,
      content: longContent
    };

    const result = await createComment(input);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(1000);
  });

  it('should maintain transaction integrity on error', async () => {
    // Create user but no post
    const user = await createTestUser();
    
    const input = {
      ...testInput,
      user_id: user.id,
      post_id: 99999 // Non-existent post
    };

    // Attempt to create comment should fail
    await expect(createComment(input)).rejects.toThrow();

    // Verify no comment was created
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.user_id, user.id))
      .execute();

    expect(comments).toHaveLength(0);

    // Verify no post comment counts were affected (since post doesn't exist)
    const posts = await db.select()
      .from(postsTable)
      .execute();

    expect(posts).toHaveLength(0);
  });
});