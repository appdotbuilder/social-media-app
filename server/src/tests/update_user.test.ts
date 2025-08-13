import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        bio: 'Original bio',
        profile_picture_url: 'https://example.com/original.jpg',
        balance: '100.50'
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should update user with all fields', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'updateduser',
      email: 'updated@example.com',
      full_name: 'Updated User',
      bio: 'Updated bio',
      profile_picture_url: 'https://example.com/updated.jpg'
    };

    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(testUser.id);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Updated User');
    expect(result.bio).toEqual('Updated bio');
    expect(result.profile_picture_url).toEqual('https://example.com/updated.jpg');
    
    // Verify unchanged fields
    expect(result.password_hash).toEqual('hashed_password');
    expect(result.balance).toEqual(100.50); // Numeric conversion test
    expect(typeof result.balance).toBe('number');
    
    // Verify updated_at changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'partialupdate'
    };

    const result = await updateUser(updateInput);

    // Verify updated field
    expect(result.username).toEqual('partialupdate');
    
    // Verify unchanged fields remain the same
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('Original bio');
    expect(result.profile_picture_url).toEqual('https://example.com/original.jpg');
    expect(result.balance).toEqual(100.50);
  });

  it('should handle null values properly', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      bio: null,
      profile_picture_url: null
    };

    const result = await updateUser(updateInput);

    expect(result.bio).toBeNull();
    expect(result.profile_picture_url).toBeNull();
    
    // Other fields should remain unchanged
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
  });

  it('should save changes to database', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'dbtest',
      email: 'dbtest@example.com'
    };

    await updateUser(updateInput);

    // Query database directly to verify changes were saved
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].username).toEqual('dbtest');
    expect(dbUsers[0].email).toEqual('dbtest@example.com');
    expect(dbUsers[0].updated_at).toBeInstanceOf(Date);
    expect(dbUsers[0].updated_at > testUser.updated_at).toBe(true);
  });

  it('should throw error when user not found', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      username: 'nonexistent'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should handle empty string values', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      full_name: 'Empty Bio User',
      bio: '' // Empty string should be allowed
    };

    const result = await updateUser(updateInput);

    expect(result.full_name).toEqual('Empty Bio User');
    expect(result.bio).toEqual('');
  });

  it('should preserve all user properties after update', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'preserved'
    };

    const result = await updateUser(updateInput);

    // Verify all properties are present and have correct types
    expect(typeof result.id).toBe('number');
    expect(typeof result.username).toBe('string');
    expect(typeof result.email).toBe('string');
    expect(typeof result.password_hash).toBe('string');
    expect(typeof result.full_name).toBe('string');
    expect(typeof result.followers_count).toBe('number');
    expect(typeof result.following_count).toBe('number');
    expect(typeof result.balance).toBe('number');
    expect(typeof result.is_premium).toBe('boolean');
    expect(typeof result.is_admin).toBe('boolean');
    expect(typeof result.is_active).toBe('boolean');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update email field correctly', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'newemail@test.com'
    };

    const result = await updateUser(updateInput);

    expect(result.email).toEqual('newemail@test.com');
    
    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(dbUser[0].email).toEqual('newemail@test.com');
  });
});