import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';

describe('createPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        bio: null,
        profile_picture_url: null,
      })
      .returning()
      .execute();

    return userResult[0];
  };

  it('should create a text post successfully', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'This is a test post',
      media_type: 'text',
    };

    const result = await createPost(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.content).toEqual('This is a test post');
    expect(result.media_urls).toBeNull();
    expect(result.media_type).toEqual('text');
    expect(result.link_url).toBeNull();
    expect(result.likes_count).toEqual(0);
    expect(result.comments_count).toEqual(0);
    expect(result.shares_count).toEqual(0);
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a photo post with media URLs', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'Check out these photos!',
      media_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      media_type: 'photo',
    };

    const result = await createPost(testInput);

    expect(result.user_id).toEqual(user.id);
    expect(result.content).toEqual('Check out these photos!');
    expect(result.media_urls).toEqual(['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']);
    expect(result.media_type).toEqual('photo');
    expect(result.link_url).toBeNull();
  });

  it('should create a video post', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'Watch this amazing video!',
      media_urls: ['https://example.com/video.mp4'],
      media_type: 'video',
    };

    const result = await createPost(testInput);

    expect(result.user_id).toEqual(user.id);
    expect(result.content).toEqual('Watch this amazing video!');
    expect(result.media_urls).toEqual(['https://example.com/video.mp4']);
    expect(result.media_type).toEqual('video');
  });

  it('should create a link post', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'Check out this interesting article',
      media_type: 'link',
      link_url: 'https://example.com/article',
    };

    const result = await createPost(testInput);

    expect(result.user_id).toEqual(user.id);
    expect(result.content).toEqual('Check out this interesting article');
    expect(result.media_urls).toBeNull();
    expect(result.media_type).toEqual('link');
    expect(result.link_url).toEqual('https://example.com/article');
  });

  it('should create a post without content (media only)', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      media_urls: ['https://example.com/image.png'],
      media_type: 'photo',
    };

    const result = await createPost(testInput);

    expect(result.user_id).toEqual(user.id);
    expect(result.content).toBeNull();
    expect(result.media_urls).toEqual(['https://example.com/image.png']);
    expect(result.media_type).toEqual('photo');
  });

  it('should save post to database correctly', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'Database persistence test',
      media_type: 'text',
    };

    const result = await createPost(testInput);

    // Query the database to verify the post was saved
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(posts).toHaveLength(1);
    const savedPost = posts[0];
    expect(savedPost.user_id).toEqual(user.id);
    expect(savedPost.content).toEqual('Database persistence test');
    expect(savedPost.media_type).toEqual('text');
    expect(savedPost.likes_count).toEqual(0);
    expect(savedPost.comments_count).toEqual(0);
    expect(savedPost.shares_count).toEqual(0);
    expect(savedPost.is_active).toBe(true);
    expect(savedPost.created_at).toBeInstanceOf(Date);
    expect(savedPost.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreatePostInput = {
      user_id: 99999, // Non-existent user ID
      content: 'This post should fail',
      media_type: 'text',
    };

    await expect(createPost(testInput)).rejects.toThrow(/User not found/i);
  });

  it('should handle complex media URLs array', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'Multiple media files',
      media_urls: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.png',
        'https://example.com/image3.gif'
      ],
      media_type: 'photo',
    };

    const result = await createPost(testInput);

    expect(result.media_urls).toEqual([
      'https://example.com/image1.jpg',
      'https://example.com/image2.png',
      'https://example.com/image3.gif'
    ]);
    expect(Array.isArray(result.media_urls)).toBe(true);
    expect(result.media_urls).toHaveLength(3);
  });

  it('should set default values correctly', async () => {
    const user = await createTestUser();
    
    const testInput: CreatePostInput = {
      user_id: user.id,
      content: 'Default values test',
      media_type: 'text',
    };

    const result = await createPost(testInput);

    // Check that default values are set correctly
    expect(result.likes_count).toEqual(0);
    expect(result.comments_count).toEqual(0);
    expect(result.shares_count).toEqual(0);
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle all media types correctly', async () => {
    const user = await createTestUser();
    
    const mediaTypes = ['text', 'photo', 'video', 'link'] as const;
    
    for (const mediaType of mediaTypes) {
      const testInput: CreatePostInput = {
        user_id: user.id,
        content: `Testing ${mediaType} post`,
        media_type: mediaType,
        media_urls: mediaType !== 'text' && mediaType !== 'link' 
          ? [`https://example.com/${mediaType}.file`] 
          : undefined,
        link_url: mediaType === 'link' ? 'https://example.com/link' : undefined,
      };

      const result = await createPost(testInput);
      
      expect(result.media_type).toEqual(mediaType);
      expect(result.content).toEqual(`Testing ${mediaType} post`);
      
      if (mediaType === 'link') {
        expect(result.link_url).toEqual('https://example.com/link');
      }
      
      if (mediaType !== 'text' && mediaType !== 'link') {
        expect(result.media_urls).toEqual([`https://example.com/${mediaType}.file`]);
      }
    }
  });
});