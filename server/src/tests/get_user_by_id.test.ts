import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user data
const testUserData = {
  username: 'testuser123',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  bio: 'This is a test bio',
  profile_picture_url: 'https://example.com/avatar.jpg',
  followers_count: 10,
  following_count: 5,
  balance: '99.50', // Store as string for numeric column
  is_premium: true,
  premium_expires_at: new Date('2024-12-31'),
  is_admin: false,
  is_active: true,
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Get user by ID
    const result = await getUserById(createdUser.id);

    // Verify user data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testuser123');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.password_hash).toEqual('hashed_password');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.bio).toEqual('This is a test bio');
    expect(result!.profile_picture_url).toEqual('https://example.com/avatar.jpg');
    expect(result!.followers_count).toEqual(10);
    expect(result!.following_count).toEqual(5);
    expect(result!.balance).toEqual(99.50); // Should be converted to number
    expect(typeof result!.balance).toBe('number'); // Verify numeric conversion
    expect(result!.is_premium).toEqual(true);
    expect(result!.premium_expires_at).toBeInstanceOf(Date);
    expect(result!.is_admin).toEqual(false);
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    // Try to get non-existent user
    const result = await getUserById(999999);

    expect(result).toBeNull();
  });

  it('should handle user with null optional fields', async () => {
    // Create user with minimal data (null optional fields)
    const minimalUserData = {
      username: 'minimal_user',
      email: 'minimal@example.com',
      password_hash: 'simple_hashed_password',
      full_name: 'Minimal User',
      bio: null,
      profile_picture_url: null,
      followers_count: 0,
      following_count: 0,
      balance: '0.00',
      is_premium: false,
      premium_expires_at: null,
      is_admin: false,
      is_active: true,
    };

    const insertResult = await db.insert(usersTable)
      .values(minimalUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Get user by ID
    const result = await getUserById(createdUser.id);

    // Verify user data with null fields
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('minimal_user');
    expect(result!.email).toEqual('minimal@example.com');
    expect(result!.full_name).toEqual('Minimal User');
    expect(result!.bio).toBeNull();
    expect(result!.profile_picture_url).toBeNull();
    expect(result!.balance).toEqual(0.00);
    expect(typeof result!.balance).toBe('number');
    expect(result!.is_premium).toEqual(false);
    expect(result!.premium_expires_at).toBeNull();
    expect(result!.is_admin).toEqual(false);
    expect(result!.is_active).toEqual(true);
  });

  it('should handle different balance values correctly', async () => {
    // Test different balance values to ensure proper numeric conversion
    const balanceTestCases = [
      { balance: '0.00', expected: 0.00 },
      { balance: '1.99', expected: 1.99 },
      { balance: '100.50', expected: 100.50 },
      { balance: '999.99', expected: 999.99 },
    ];

    for (const testCase of balanceTestCases) {
      const userData = {
        username: `user_${testCase.balance.replace('.', '_')}`,
        email: `user${testCase.balance.replace('.', '')}@example.com`,
        password_hash: 'hashed_password',
        full_name: 'Balance Test User',
        balance: testCase.balance,
      };

      const insertResult = await db.insert(usersTable)
        .values(userData)
        .returning()
        .execute();

      const result = await getUserById(insertResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.balance).toEqual(testCase.expected);
      expect(typeof result!.balance).toBe('number');
    }
  });

  it('should handle inactive users', async () => {
    // Create inactive user
    const inactiveUserData = {
      ...testUserData,
      username: 'inactive_user',
      email: 'inactive@example.com',
      is_active: false,
    };

    const insertResult = await db.insert(usersTable)
      .values(inactiveUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Get inactive user by ID (should still return the user)
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.is_active).toEqual(false);
    expect(result!.username).toEqual('inactive_user');
  });

  it('should handle admin users', async () => {
    // Create admin user
    const adminUserData = {
      ...testUserData,
      username: 'admin_user',
      email: 'admin@example.com',
      is_admin: true,
    };

    const insertResult = await db.insert(usersTable)
      .values(adminUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Get admin user by ID
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.is_admin).toEqual(true);
    expect(result!.username).toEqual('admin_user');
  });
});