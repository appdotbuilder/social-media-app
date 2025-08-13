import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers, type GetUsersInput } from '../handlers/get_users';

// Test data setup
const createTestUsers = async () => {
  const users = [
    {
      username: 'alice_smith',
      email: 'alice@example.com',
      password_hash: 'hashed_password_123',
      full_name: 'Alice Smith',
      bio: 'Tech enthusiast',
      followers_count: 150,
      following_count: 75,
      balance: '100.50',
      is_premium: true,
      is_admin: false,
      is_active: true,
    },
    {
      username: 'bob_johnson',
      email: 'bob@example.com',
      password_hash: 'hashed_password_456',
      full_name: 'Bob Johnson',
      bio: 'Designer',
      followers_count: 300,
      following_count: 120,
      balance: '250.75',
      is_premium: false,
      is_admin: false,
      is_active: true,
    },
    {
      username: 'charlie_admin',
      email: 'charlie@example.com',
      password_hash: 'hashed_password_789',
      full_name: 'Charlie Admin',
      bio: 'System administrator',
      followers_count: 50,
      following_count: 25,
      balance: '0.00',
      is_premium: true,
      is_admin: true,
      is_active: true,
    },
    {
      username: 'diana_inactive',
      email: 'diana@example.com',
      password_hash: 'hashed_password_012',
      full_name: 'Diana Inactive',
      bio: 'Former user',
      followers_count: 10,
      following_count: 5,
      balance: '15.25',
      is_premium: false,
      is_admin: false,
      is_active: false,
    },
  ];

  await db.insert(usersTable).values(users).execute();
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all users with default parameters', async () => {
    await createTestUsers();
    
    const result = await getUsers();

    expect(result).toHaveLength(4);
    // Since all users are created at nearly the same time, check we got all users
    const usernames = result.map(u => u.username).sort();
    expect(usernames).toEqual(['alice_smith', 'bob_johnson', 'charlie_admin', 'diana_inactive']);
    expect(typeof result[0].balance).toBe('number');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should apply pagination correctly', async () => {
    await createTestUsers();

    const input: GetUsersInput = {
      page: 1,
      limit: 2
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(2);
    
    // Test second page
    const secondPage = await getUsers({ page: 2, limit: 2 });
    expect(secondPage).toHaveLength(2);
    
    // Ensure different results
    expect(result[0].id).not.toBe(secondPage[0].id);
  });

  it('should filter by search query', async () => {
    await createTestUsers();

    const input: GetUsersInput = {
      search: 'alice'
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('alice_smith');
    expect(result[0].full_name).toBe('Alice Smith');
  });

  it('should filter by active status', async () => {
    await createTestUsers();

    const activeUsers = await getUsers({ is_active: true });
    const inactiveUsers = await getUsers({ is_active: false });

    expect(activeUsers).toHaveLength(3);
    expect(inactiveUsers).toHaveLength(1);
    expect(inactiveUsers[0].username).toBe('diana_inactive');
    expect(inactiveUsers[0].is_active).toBe(false);
  });

  it('should filter by premium status', async () => {
    await createTestUsers();

    const premiumUsers = await getUsers({ is_premium: true });
    const regularUsers = await getUsers({ is_premium: false });

    expect(premiumUsers).toHaveLength(2);
    expect(regularUsers).toHaveLength(2);
    
    premiumUsers.forEach(user => {
      expect(user.is_premium).toBe(true);
    });
  });

  it('should filter by admin status', async () => {
    await createTestUsers();

    const adminUsers = await getUsers({ is_admin: true });
    const regularUsers = await getUsers({ is_admin: false });

    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0].username).toBe('charlie_admin');
    expect(regularUsers).toHaveLength(3);
  });

  it('should handle multiple filters', async () => {
    await createTestUsers();

    const input: GetUsersInput = {
      is_active: true,
      is_premium: true
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(2);
    result.forEach(user => {
      expect(user.is_active).toBe(true);
      expect(user.is_premium).toBe(true);
    });
  });

  it('should order by username ascending', async () => {
    await createTestUsers();

    const input: GetUsersInput = {
      order_by: 'username',
      order_direction: 'asc'
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(4);
    expect(result[0].username).toBe('alice_smith');
    expect(result[1].username).toBe('bob_johnson');
    expect(result[2].username).toBe('charlie_admin');
    expect(result[3].username).toBe('diana_inactive');
  });

  it('should order by followers count descending', async () => {
    await createTestUsers();

    const input: GetUsersInput = {
      order_by: 'followers_count',
      order_direction: 'desc'
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(4);
    expect(result[0].followers_count).toBe(300); // bob_johnson
    expect(result[1].followers_count).toBe(150); // alice_smith
    expect(result[2].followers_count).toBe(50);  // charlie_admin
    expect(result[3].followers_count).toBe(10);  // diana_inactive
  });

  it('should handle empty results', async () => {
    const input: GetUsersInput = {
      search: 'nonexistent_user'
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(0);
  });

  it('should handle complex search and filter combination', async () => {
    await createTestUsers();

    const input: GetUsersInput = {
      search: 'charlie',
      is_active: true,
      is_admin: true,
      order_by: 'username',
      order_direction: 'asc',
      limit: 10
    };

    const result = await getUsers(input);

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('charlie_admin');
    expect(result[0].is_active).toBe(true);
    expect(result[0].is_admin).toBe(true);
  });

  it('should convert numeric fields correctly', async () => {
    await createTestUsers();

    const result = await getUsers({ limit: 1 });

    expect(result).toHaveLength(1);
    expect(typeof result[0].balance).toBe('number');
    expect(typeof result[0].followers_count).toBe('number');
    expect(typeof result[0].following_count).toBe('number');
    expect(typeof result[0].id).toBe('number');
  });

  it('should handle zero limit gracefully', async () => {
    await createTestUsers();

    const result = await getUsers({ limit: 0 });

    expect(result).toHaveLength(0);
  });
});