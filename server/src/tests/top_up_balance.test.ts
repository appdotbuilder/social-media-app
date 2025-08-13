import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type TopUpInput } from '../schema';
import { topUpBalance } from '../handlers/top_up_balance';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  full_name: 'Test User',
  bio: null,
  profile_picture_url: null,
  followers_count: 0,
  following_count: 0,
  balance: '50.00', // Initial balance
  is_premium: false,
  premium_expires_at: null,
  is_admin: false,
  is_active: true
};

// Simple test input
const testInput: TopUpInput = {
  user_id: 1, // Will be set after user creation
  amount: 25.99
};

describe('topUpBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should top up user balance and create transaction record', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const input = { ...testInput, user_id: user.id };

    const result = await topUpBalance(input);

    // Verify transaction fields
    expect(result.user_id).toEqual(user.id);
    expect(result.type).toEqual('topup');
    expect(result.amount).toEqual(25.99);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Balance top-up of $25.99');
    expect(result.premium_package_id).toBeNull();
    expect(result.status).toEqual('completed');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user balance correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const input = { ...testInput, user_id: user.id };

    await topUpBalance(input);

    // Verify user balance was updated
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(parseFloat(updatedUser[0].balance)).toEqual(75.99); // 50.00 + 25.99
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const input = { ...testInput, user_id: user.id };

    const result = await topUpBalance(input);

    // Verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(user.id);
    expect(transactions[0].type).toEqual('topup');
    expect(parseFloat(transactions[0].amount)).toEqual(25.99);
    expect(transactions[0].description).toEqual('Balance top-up of $25.99');
    expect(transactions[0].status).toEqual('completed');
    expect(transactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const input = { 
      user_id: user.id, 
      amount: 100.55 // Test with decimal amount
    };

    const result = await topUpBalance(input);

    // Verify transaction amount
    expect(result.amount).toEqual(100.55);
    expect(typeof result.amount).toBe('number');

    // Verify user balance
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUser[0].balance)).toEqual(150.55); // 50.00 + 100.55
  });

  it('should handle zero initial balance correctly', async () => {
    // Create test user with zero balance
    const zeroBalanceUser = {
      ...testUser,
      balance: '0.00'
    };

    const userResult = await db.insert(usersTable)
      .values(zeroBalanceUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const input = { ...testInput, user_id: user.id };

    await topUpBalance(input);

    // Verify balance calculation
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUser[0].balance)).toEqual(25.99); // 0.00 + 25.99
  });

  it('should throw error for non-existent user', async () => {
    const input = { 
      user_id: 999, // Non-existent user ID
      amount: 25.99 
    };

    expect(topUpBalance(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle large amounts correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const input = { 
      user_id: user.id, 
      amount: 1000.00 // Test with large round amount
    };

    const result = await topUpBalance(input);

    // Verify transaction amount
    expect(result.amount).toEqual(1000.00);
    expect(typeof result.amount).toBe('number');

    // Verify user balance
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUser[0].balance)).toEqual(1050.00); // 50.00 + 1000.00
  });
});