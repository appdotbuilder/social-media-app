import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, premiumPackagesTable, transactionsTable } from '../db/schema';
import { purchasePremium } from '../handlers/purchase_premium';
import { eq } from 'drizzle-orm';

describe('purchasePremium', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPackageId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        balance: '100.00',
        is_premium: false,
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test premium package
    const packageResult = await db.insert(premiumPackagesTable)
      .values({
        name: 'Premium Monthly',
        description: 'Monthly premium subscription',
        price: '19.99',
        duration_days: 30,
        features: ['feature1', 'feature2'],
        is_active: true,
      })
      .returning()
      .execute();

    testPackageId = packageResult[0].id;
  });

  it('should successfully purchase premium package', async () => {
    const result = await purchasePremium(testUserId, testPackageId);

    // Verify transaction details
    expect(result.user_id).toEqual(testUserId);
    expect(result.type).toEqual('purchase');
    expect(result.amount).toEqual(19.99);
    expect(result.description).toContain('Premium Monthly');
    expect(result.premium_package_id).toEqual(testPackageId);
    expect(result.status).toEqual('completed');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update user balance and premium status', async () => {
    await purchasePremium(testUserId, testPackageId);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(parseFloat(updatedUser[0].balance)).toEqual(80.01); // 100 - 19.99
    expect(updatedUser[0].is_premium).toBe(true);
    expect(updatedUser[0].premium_expires_at).toBeInstanceOf(Date);
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should calculate premium expiration date correctly', async () => {
    const beforePurchase = new Date();
    await purchasePremium(testUserId, testPackageId);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const expirationDate = updatedUser[0].premium_expires_at!;
    const expectedExpiration = new Date(beforePurchase.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    // Allow for small time differences (within 1 minute)
    const timeDifference = Math.abs(expirationDate.getTime() - expectedExpiration.getTime());
    expect(timeDifference).toBeLessThan(60000);
  });

  it('should extend existing premium subscription', async () => {
    // Set user as already premium with future expiration
    const currentExpiration = new Date();
    currentExpiration.setDate(currentExpiration.getDate() + 15); // 15 days from now

    await db.update(usersTable)
      .set({
        is_premium: true,
        premium_expires_at: currentExpiration,
      })
      .where(eq(usersTable.id, testUserId))
      .execute();

    await purchasePremium(testUserId, testPackageId);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const newExpiration = updatedUser[0].premium_expires_at!;
    const expectedExpiration = new Date(currentExpiration.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    // Allow for small time differences
    const timeDifference = Math.abs(newExpiration.getTime() - expectedExpiration.getTime());
    expect(timeDifference).toBeLessThan(60000);
  });

  it('should create transaction record in database', async () => {
    const result = await purchasePremium(testUserId, testPackageId);

    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(testUserId);
    expect(transactions[0].type).toEqual('purchase');
    expect(parseFloat(transactions[0].amount)).toEqual(19.99);
    expect(transactions[0].premium_package_id).toEqual(testPackageId);
    expect(transactions[0].status).toEqual('completed');
  });

  it('should throw error for non-existent user', async () => {
    await expect(purchasePremium(99999, testPackageId)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent package', async () => {
    await expect(purchasePremium(testUserId, 99999)).rejects.toThrow(/premium package not found/i);
  });

  it('should throw error for insufficient balance', async () => {
    // Update user balance to less than package price
    await db.update(usersTable)
      .set({ balance: '10.00' })
      .where(eq(usersTable.id, testUserId))
      .execute();

    await expect(purchasePremium(testUserId, testPackageId)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error for inactive package', async () => {
    // Deactivate the package
    await db.update(premiumPackagesTable)
      .set({ is_active: false })
      .where(eq(premiumPackagesTable.id, testPackageId))
      .execute();

    await expect(purchasePremium(testUserId, testPackageId)).rejects.toThrow(/premium package is not available/i);
  });

  it('should handle exact balance match', async () => {
    // Set user balance to exactly match package price
    await db.update(usersTable)
      .set({ balance: '19.99' })
      .where(eq(usersTable.id, testUserId))
      .execute();

    const result = await purchasePremium(testUserId, testPackageId);

    expect(result.amount).toEqual(19.99);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(parseFloat(updatedUser[0].balance)).toEqual(0.00);
    expect(updatedUser[0].is_premium).toBe(true);
  });

  it('should handle high precision decimal calculations', async () => {
    // Create package with complex decimal price
    const complexPackageResult = await db.insert(premiumPackagesTable)
      .values({
        name: 'Complex Premium',
        price: '29.37',
        duration_days: 60,
        features: ['complex_feature'],
        is_active: true,
      })
      .returning()
      .execute();

    const complexPackageId = complexPackageResult[0].id;

    // Set user balance with enough for purchase
    await db.update(usersTable)
      .set({ balance: '50.00' })
      .where(eq(usersTable.id, testUserId))
      .execute();

    const result = await purchasePremium(testUserId, complexPackageId);

    expect(result.amount).toEqual(29.37);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(parseFloat(updatedUser[0].balance)).toEqual(20.63); // 50.00 - 29.37
  });
});