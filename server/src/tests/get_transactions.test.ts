import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';
import { eq } from 'drizzle-orm';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all transactions when no userId provided', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create test transactions for different users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user1Id,
          type: 'topup',
          amount: '100.50',
          description: 'User 1 topup',
          status: 'completed'
        },
        {
          user_id: user2Id,
          type: 'purchase',
          amount: '25.99',
          description: 'User 2 purchase',
          status: 'completed'
        },
        {
          user_id: user1Id,
          type: 'refund',
          amount: '10.00',
          description: 'User 1 refund',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(3);
    
    // Verify numeric conversion
    result.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
    });

    // Verify all transactions are included (sort numerically for comparison)
    const amounts = result.map(t => t.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([10.00, 25.99, 100.50]);
  });

  it('should filter transactions by userId', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResult[0].id;
    const user2Id = userResult[1].id;

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user1Id,
          type: 'topup',
          amount: '100.00',
          description: 'User 1 topup',
          status: 'completed'
        },
        {
          user_id: user2Id,
          type: 'purchase',
          amount: '50.00',
          description: 'User 2 purchase',
          status: 'completed'
        },
        {
          user_id: user1Id,
          type: 'refund',
          amount: '25.00',
          description: 'User 1 refund',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getTransactions(user1Id);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.user_id).toBe(user1Id);
      expect(typeof transaction.amount).toBe('number');
    });

    // Verify specific transactions (sort numerically for comparison)
    const amounts = result.map(t => t.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([25.00, 100.00]);
  });

  it('should order transactions by newest first', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create transactions with different timestamps by inserting them separately
    const transaction1 = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'topup',
        amount: '100.00',
        description: 'First transaction',
        status: 'completed'
      })
      .returning()
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const transaction2 = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'purchase',
        amount: '50.00',
        description: 'Second transaction',
        status: 'completed'
      })
      .returning()
      .execute();

    const result = await getTransactions(userId);

    expect(result).toHaveLength(2);
    
    // Verify ordering (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[0].description).toBe('Second transaction');
    expect(result[1].description).toBe('First transaction');
  });

  it('should return empty array when user has no transactions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getTransactions(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle userId 0 correctly', async () => {
    // Create test user with ID that won't be 0
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'topup',
        amount: '100.00',
        description: 'Test transaction',
        status: 'completed'
      })
      .execute();

    // Query with userId 0 (which shouldn't match anything)
    const result = await getTransactions(0);

    expect(result).toHaveLength(0);
  });

  it('should verify transaction is saved to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'purchase',
        amount: '75.25',
        description: 'Test purchase',
        status: 'completed'
      })
      .execute();

    const result = await getTransactions(userId);
    expect(result).toHaveLength(1);

    const transaction = result[0];
    expect(transaction.user_id).toBe(userId);
    expect(transaction.type).toBe('purchase');
    expect(transaction.amount).toBe(75.25);
    expect(transaction.description).toBe('Test purchase');
    expect(transaction.status).toBe('completed');
    expect(transaction.id).toBeDefined();
    expect(transaction.created_at).toBeInstanceOf(Date);
    expect(transaction.updated_at).toBeInstanceOf(Date);

    // Verify direct database query matches
    const dbTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(dbTransactions).toHaveLength(1);
    expect(parseFloat(dbTransactions[0].amount)).toBe(75.25);
  });
});