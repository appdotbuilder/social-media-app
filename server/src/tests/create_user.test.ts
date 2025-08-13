import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  username: 'testuser123',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  bio: 'This is a test bio',
  profile_picture_url: 'https://example.com/avatar.jpg',
};

// Minimal test input (only required fields)
const minimalInput: CreateUserInput = {
  username: 'minimal_user',
  email: 'minimal@example.com',
  password: 'securepass',
  full_name: 'Minimal User',
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser123');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('This is a test bio');
    expect(result.profile_picture_url).toEqual('https://example.com/avatar.jpg');
    
    // Default values
    expect(result.followers_count).toEqual(0);
    expect(result.following_count).toEqual(0);
    expect(typeof result.balance).toBe('number');
    expect(result.balance).toEqual(0);
    expect(result.is_premium).toEqual(false);
    expect(result.premium_expires_at).toBeNull();
    expect(result.is_admin).toEqual(false);
    expect(result.is_active).toEqual(true);
    
    // Auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should create a user with minimal required fields', async () => {
    const result = await createUser(minimalInput);

    expect(result.username).toEqual('minimal_user');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.full_name).toEqual('Minimal User');
    expect(result.bio).toBeNull();
    expect(result.profile_picture_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password securely', async () => {
    const result = await createUser(testInput);

    // Password should be hashed, not stored in plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed passwords are much longer

    // Should be able to verify the password using Bun's password verification
    const isValidPassword = await Bun.password.verify('password123', result.password_hash);
    expect(isValidPassword).toBe(true);

    // Wrong password should not match
    const isInvalidPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('testuser123');
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.full_name).toEqual('Test User');
    expect(savedUser.bio).toEqual('This is a test bio');
    expect(savedUser.profile_picture_url).toEqual('https://example.com/avatar.jpg');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
    
    // Verify numeric field is properly stored and retrieved
    expect(parseFloat(savedUser.balance)).toEqual(0);
  });

  it('should handle unique constraint violations', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com',
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow();

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      ...testInput,
      username: 'different_user',
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow();
  });

  it('should handle null optional fields correctly', async () => {
    const inputWithNulls: CreateUserInput = {
      username: 'nulltest',
      email: 'nulltest@example.com',
      password: 'password123',
      full_name: 'Null Test User',
      bio: null,
      profile_picture_url: null,
    };

    const result = await createUser(inputWithNulls);

    expect(result.bio).toBeNull();
    expect(result.profile_picture_url).toBeNull();

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].bio).toBeNull();
    expect(users[0].profile_picture_url).toBeNull();
  });

  it('should set correct default timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});