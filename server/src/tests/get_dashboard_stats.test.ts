import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, transactionsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const result = await getDashboardStats();

    expect(result.total_users).toBe(0);
    expect(result.active_users).toBe(0);
    expect(result.total_posts).toBe(0);
    expect(result.total_transactions).toBe(0);
    expect(result.revenue).toBe(0);
    expect(result.premium_users).toBe(0);
  });

  it('should count users correctly', async () => {
    const hashedPassword = 'test_hash_123';

    // Create active users
    await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          password_hash: hashedPassword,
          full_name: 'User One',
          is_active: true
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          password_hash: hashedPassword,
          full_name: 'User Two',
          is_active: true
        },
        {
          username: 'user3',
          email: 'user3@test.com',
          password_hash: hashedPassword,
          full_name: 'User Three',
          is_active: false // Inactive user
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_users).toBe(3);
    expect(result.active_users).toBe(2);
  });

  it('should count posts correctly', async () => {
    const hashedPassword = 'test_hash_123';

    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: hashedPassword,
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create posts (both active and inactive)
    await db.insert(postsTable)
      .values([
        {
          user_id: userId,
          content: 'Active post 1',
          media_type: 'text',
          is_active: true
        },
        {
          user_id: userId,
          content: 'Active post 2',
          media_type: 'text',
          is_active: true
        },
        {
          user_id: userId,
          content: 'Inactive post',
          media_type: 'text',
          is_active: false
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_posts).toBe(2); // Only active posts
  });

  it('should count transactions and calculate revenue correctly', async () => {
    const hashedPassword = 'test_hash_123';

    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: hashedPassword,
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create transactions with different statuses
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          type: 'topup',
          amount: '100.00',
          description: 'Completed topup',
          status: 'completed'
        },
        {
          user_id: userId,
          type: 'purchase',
          amount: '50.75',
          description: 'Completed purchase',
          status: 'completed'
        },
        {
          user_id: userId,
          type: 'topup',
          amount: '25.00',
          description: 'Pending transaction',
          status: 'pending'
        },
        {
          user_id: userId,
          type: 'topup',
          amount: '75.00',
          description: 'Failed transaction',
          status: 'failed'
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_transactions).toBe(4);
    expect(result.revenue).toBe(150.75); // Only completed transactions
    expect(typeof result.revenue).toBe('number');
  });

  it('should count premium users correctly', async () => {
    const hashedPassword = 'test_hash_123';
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Create users with different premium statuses
    await db.insert(usersTable)
      .values([
        {
          username: 'premium1',
          email: 'premium1@test.com',
          password_hash: hashedPassword,
          full_name: 'Premium User One',
          is_premium: true,
          premium_expires_at: futureDate // Valid premium
        },
        {
          username: 'premium2',
          email: 'premium2@test.com',
          password_hash: hashedPassword,
          full_name: 'Premium User Two',
          is_premium: true,
          premium_expires_at: futureDate // Valid premium
        },
        {
          username: 'expired',
          email: 'expired@test.com',
          password_hash: hashedPassword,
          full_name: 'Expired Premium User',
          is_premium: true,
          premium_expires_at: pastDate // Expired premium
        },
        {
          username: 'nonpremium',
          email: 'nonpremium@test.com',
          password_hash: hashedPassword,
          full_name: 'Non Premium User',
          is_premium: false,
          premium_expires_at: null
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_users).toBe(4);
    expect(result.premium_users).toBe(2); // Only users with valid premium
  });

  it('should return comprehensive stats with all data', async () => {
    const hashedPassword = 'test_hash_123';
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        {
          username: 'admin',
          email: 'admin@test.com',
          password_hash: hashedPassword,
          full_name: 'Admin User',
          is_premium: true,
          premium_expires_at: futureDate,
          is_active: true
        },
        {
          username: 'regular',
          email: 'regular@test.com',
          password_hash: hashedPassword,
          full_name: 'Regular User',
          is_active: true
        }
      ])
      .returning()
      .execute();

    const adminId = userResults[0].id;
    const regularId = userResults[1].id;

    // Create posts
    await db.insert(postsTable)
      .values([
        {
          user_id: adminId,
          content: 'Admin post',
          media_type: 'text',
          is_active: true
        },
        {
          user_id: regularId,
          content: 'User post',
          media_type: 'photo',
          is_active: true
        }
      ])
      .execute();

    // Create transactions
    await db.insert(transactionsTable)
      .values([
        {
          user_id: adminId,
          type: 'purchase',
          amount: '29.99',
          description: 'Premium purchase',
          status: 'completed'
        },
        {
          user_id: regularId,
          type: 'topup',
          amount: '10.00',
          description: 'Account topup',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_users).toBe(2);
    expect(result.active_users).toBe(2);
    expect(result.total_posts).toBe(2);
    expect(result.total_transactions).toBe(2);
    expect(result.revenue).toBe(39.99);
    expect(result.premium_users).toBe(1);
  });
});