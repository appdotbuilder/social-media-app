import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SearchUsersInput } from '../schema';
import { searchUsers } from '../handlers/search_users';
import { eq } from 'drizzle-orm';

// Helper to create test users
const createTestUser = async (userData: {
  username: string;
  email: string;
  full_name: string;
  followers_count?: number;
  is_active?: boolean;
}) => {
  const result = await db.insert(usersTable)
    .values({
      username: userData.username,
      email: userData.email,
      password_hash: 'hashedpassword123', // Simple static hash for testing
      full_name: userData.full_name,
      followers_count: userData.followers_count || 0,
      is_active: userData.is_active !== undefined ? userData.is_active : true,
    })
    .returning()
    .execute();

  return result[0];
};

describe('searchUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search users by username', async () => {
    // Create test users
    await createTestUser({
      username: 'johndoe',
      email: 'john@example.com',
      full_name: 'John Doe'
    });

    await createTestUser({
      username: 'janedoe',
      email: 'jane@example.com',
      full_name: 'Jane Doe'
    });

    await createTestUser({
      username: 'bobsmith',
      email: 'bob@example.com',
      full_name: 'Bob Smith'
    });

    const input: SearchUsersInput = {
      query: 'john',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('johndoe');
    expect(results[0].full_name).toBe('John Doe');
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(typeof results[0].balance).toBe('number');
  });

  it('should search users by full name', async () => {
    await createTestUser({
      username: 'user1',
      email: 'alice@example.com',
      full_name: 'Alice Johnson'
    });

    await createTestUser({
      username: 'user2',
      email: 'bob@example.com',
      full_name: 'Bob Johnson'
    });

    const input: SearchUsersInput = {
      query: 'Johnson',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(2);
    expect(results.some(user => user.full_name === 'Alice Johnson')).toBe(true);
    expect(results.some(user => user.full_name === 'Bob Johnson')).toBe(true);
  });

  it('should perform case-insensitive search', async () => {
    await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User'
    });

    const input: SearchUsersInput = {
      query: 'TEST',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('testuser');
  });

  it('should support partial matches', async () => {
    await createTestUser({
      username: 'developer123',
      email: 'dev@example.com',
      full_name: 'Development User'
    });

    const input: SearchUsersInput = {
      query: 'dev',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('developer123');
  });

  it('should exclude inactive users', async () => {
    await createTestUser({
      username: 'activeuser',
      email: 'active@example.com',
      full_name: 'Active User',
      is_active: true
    });

    await createTestUser({
      username: 'inactiveuser',
      email: 'inactive@example.com',
      full_name: 'Inactive User',
      is_active: false
    });

    const input: SearchUsersInput = {
      query: 'user',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('activeuser');
    expect(results[0].is_active).toBe(true);
  });

  it('should order results by followers count descending', async () => {
    await createTestUser({
      username: 'popular',
      email: 'popular@example.com',
      full_name: 'Popular User',
      followers_count: 1000
    });

    await createTestUser({
      username: 'regular',
      email: 'regular@example.com',
      full_name: 'Regular User',
      followers_count: 10
    });

    await createTestUser({
      username: 'newbie',
      email: 'newbie@example.com',
      full_name: 'Newbie User',
      followers_count: 0
    });

    const input: SearchUsersInput = {
      query: 'user',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(3);
    expect(results[0].followers_count).toBe(1000);
    expect(results[1].followers_count).toBe(10);
    expect(results[2].followers_count).toBe(0);
  });

  it('should handle pagination correctly', async () => {
    // Create multiple test users
    for (let i = 1; i <= 25; i++) {
      await createTestUser({
        username: `testuser${i}`,
        email: `test${i}@example.com`,
        full_name: `Test User ${i}`
      });
    }

    // Test first page
    const firstPageInput: SearchUsersInput = {
      query: 'test',
      page: 1,
      limit: 10
    };

    const firstPage = await searchUsers(firstPageInput);
    expect(firstPage).toHaveLength(10);

    // Test second page
    const secondPageInput: SearchUsersInput = {
      query: 'test',
      page: 2,
      limit: 10
    };

    const secondPage = await searchUsers(secondPageInput);
    expect(secondPage).toHaveLength(10);

    // Test third page
    const thirdPageInput: SearchUsersInput = {
      query: 'test',
      page: 3,
      limit: 10
    };

    const thirdPage = await searchUsers(thirdPageInput);
    expect(thirdPage).toHaveLength(5);

    // Ensure no duplicate results between pages
    const firstPageIds = new Set(firstPage.map(user => user.id));
    const secondPageIds = new Set(secondPage.map(user => user.id));
    const thirdPageIds = new Set(thirdPage.map(user => user.id));

    expect(firstPageIds.size).toBe(10);
    expect(secondPageIds.size).toBe(10);
    expect(thirdPageIds.size).toBe(5);

    // Check no overlap between pages
    const hasOverlap = [...firstPageIds].some(id => secondPageIds.has(id)) ||
                      [...firstPageIds].some(id => thirdPageIds.has(id)) ||
                      [...secondPageIds].some(id => thirdPageIds.has(id));
    expect(hasOverlap).toBe(false);
  });

  it('should use default pagination values when not provided', async () => {
    // Create test users
    for (let i = 1; i <= 5; i++) {
      await createTestUser({
        username: `user${i}`,
        email: `user${i}@example.com`,
        full_name: `User ${i}`
      });
    }

    const input: SearchUsersInput = {
      query: 'user'
      // page and limit not provided - should use defaults
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(5);
    expect(results[0].id).toBeDefined();
  });

  it('should return empty array when no users match', async () => {
    await createTestUser({
      username: 'johndoe',
      email: 'john@example.com',
      full_name: 'John Doe'
    });

    const input: SearchUsersInput = {
      query: 'nonexistent',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(0);
  });

  it('should handle special characters in search query', async () => {
    await createTestUser({
      username: 'user.test',
      email: 'special@example.com',
      full_name: 'User Test'
    });

    const input: SearchUsersInput = {
      query: 'user.',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('user.test');
  });

  it('should convert numeric fields correctly', async () => {
    await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User'
    });

    const input: SearchUsersInput = {
      query: 'test',
      page: 1,
      limit: 10
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(typeof results[0].balance).toBe('number');
    expect(results[0].balance).toBe(0);
    expect(typeof results[0].followers_count).toBe('number');
    expect(typeof results[0].following_count).toBe('number');
  });
});