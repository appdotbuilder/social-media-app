import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type GetPostsInput } from '../schema';
import { getPosts } from '../handlers/get_posts';

// Test data
const testUser1 = {
  username: 'testuser1',
  email: 'test1@example.com',
  password_hash: 'hashedpassword123',
  full_name: 'Test User One',
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  password_hash: 'hashedpassword456',
  full_name: 'Test User Two',
};

describe('getPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no posts exist', async () => {
    const result = await getPosts();

    expect(result).toEqual([]);
  });

  it('should return posts with default pagination', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create test posts with slight delay to ensure different timestamps
    const [firstPost] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: 'First post',
        media_type: 'text',
      })
      .returning()
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [secondPost] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: 'Second post',
        media_type: 'text',
      })
      .returning()
      .execute();

    const result = await getPosts();

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Second post'); // Most recent first
    expect(result[1].content).toEqual('First post');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].media_type).toEqual('text');
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Verify timestamps are ordered correctly
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should apply pagination correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create 5 test posts one by one with delays to ensure different timestamps
    const createdPosts = [];
    for (let i = 1; i <= 5; i++) {
      const [post] = await db.insert(postsTable)
        .values({
          user_id: user.id,
          content: `Post ${i}`,
          media_type: 'text' as const,
        })
        .returning()
        .execute();
      
      createdPosts.push(post);
      
      // Small delay to ensure different created_at timestamps
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Test first page with limit 2
    const input: GetPostsInput = { page: 1, limit: 2 };
    const page1Result = await getPosts(input);

    expect(page1Result).toHaveLength(2);
    expect(page1Result[0].content).toEqual('Post 5'); // Most recent first
    expect(page1Result[1].content).toEqual('Post 4');

    // Test second page
    const page2Input: GetPostsInput = { page: 2, limit: 2 };
    const page2Result = await getPosts(page2Input);

    expect(page2Result).toHaveLength(2);
    expect(page2Result[0].content).toEqual('Post 3');
    expect(page2Result[1].content).toEqual('Post 2');

    // Test third page
    const page3Input: GetPostsInput = { page: 3, limit: 2 };
    const page3Result = await getPosts(page3Input);

    expect(page3Result).toHaveLength(1);
    expect(page3Result[0].content).toEqual('Post 1');
  });

  it('should filter posts by user_id', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    // Create posts for both users with delays
    await db.insert(postsTable)
      .values({
        user_id: user1.id,
        content: 'User 1 post 1',
        media_type: 'text',
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(postsTable)
      .values({
        user_id: user1.id,
        content: 'User 1 post 2',
        media_type: 'text',
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(postsTable)
      .values({
        user_id: user2.id,
        content: 'User 2 post 1',
        media_type: 'text',
      })
      .execute();

    // Filter by user1
    const input: GetPostsInput = { user_id: user1.id };
    const result = await getPosts(input);

    expect(result).toHaveLength(2);
    expect(result.every(post => post.user_id === user1.id)).toBe(true);
    expect(result[0].content).toEqual('User 1 post 2'); // Most recent first
    expect(result[1].content).toEqual('User 1 post 1');
  });

  it('should handle posts with different media types and URLs', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create posts with different media types
    await db.insert(postsTable)
      .values([
        {
          user_id: user.id,
          content: 'Text post',
          media_type: 'text',
        },
        {
          user_id: user.id,
          content: 'Photo post',
          media_type: 'photo',
          media_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        },
        {
          user_id: user.id,
          content: 'Link post',
          media_type: 'link',
          link_url: 'https://example.com/article',
        },
      ])
      .execute();

    const result = await getPosts();

    expect(result).toHaveLength(3);
    
    // Find posts by content
    const textPost = result.find(p => p.content === 'Text post');
    const photoPost = result.find(p => p.content === 'Photo post');
    const linkPost = result.find(p => p.content === 'Link post');

    expect(textPost?.media_type).toEqual('text');
    expect(textPost?.media_urls).toBeNull();
    expect(textPost?.link_url).toBeNull();

    expect(photoPost?.media_type).toEqual('photo');
    expect(photoPost?.media_urls).toEqual(['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']);

    expect(linkPost?.media_type).toEqual('link');
    expect(linkPost?.link_url).toEqual('https://example.com/article');
  });

  it('should combine user filtering with pagination', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    // Create multiple posts for user1 with delays
    for (let i = 1; i <= 5; i++) {
      await db.insert(postsTable)
        .values({
          user_id: user1.id,
          content: `User 1 Post ${i}`,
          media_type: 'text' as const,
        })
        .execute();
      
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Add some posts for user2
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.insert(postsTable)
      .values({
        user_id: user2.id,
        content: 'User 2 Post',
        media_type: 'text' as const,
      })
      .execute();

    // Filter by user1 with pagination
    const input: GetPostsInput = { user_id: user1.id, page: 1, limit: 2 };
    const result = await getPosts(input);

    expect(result).toHaveLength(2);
    expect(result.every(post => post.user_id === user1.id)).toBe(true);
    expect(result[0].content).toEqual('User 1 Post 5'); // Most recent first
    expect(result[1].content).toEqual('User 1 Post 4');
  });

  it('should return empty array for non-existent user', async () => {
    // Create test user and post
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: 'Test post',
        media_type: 'text',
      })
      .execute();

    // Query with non-existent user_id
    const input: GetPostsInput = { user_id: 999999 };
    const result = await getPosts(input);

    expect(result).toEqual([]);
  });

  it('should handle posts with null content', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create post with null content (media only)
    await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: null,
        media_type: 'photo',
        media_urls: ['https://example.com/photo.jpg'],
      })
      .execute();

    const result = await getPosts();

    expect(result).toHaveLength(1);
    expect(result[0].content).toBeNull();
    expect(result[0].media_type).toEqual('photo');
    expect(result[0].media_urls).toEqual(['https://example.com/photo.jpg']);
  });
});