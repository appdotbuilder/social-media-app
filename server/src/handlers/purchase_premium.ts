import { db } from '../db';
import { usersTable, premiumPackagesTable, transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const purchasePremium = async (userId: number, packageId: number): Promise<Transaction> => {
  try {
    // Fetch user and package information
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const premiumPackage = await db.select()
      .from(premiumPackagesTable)
      .where(eq(premiumPackagesTable.id, packageId))
      .execute();

    if (premiumPackage.length === 0) {
      throw new Error('Premium package not found');
    }

    if (!premiumPackage[0].is_active) {
      throw new Error('Premium package is not available');
    }

    const userBalance = parseFloat(user[0].balance);
    const packagePrice = parseFloat(premiumPackage[0].price);

    // Check if user has sufficient balance
    if (userBalance < packagePrice) {
      throw new Error('Insufficient balance');
    }

    // Calculate new premium expiration date
    const now = new Date();
    const currentExpiration = user[0].premium_expires_at;
    const startDate = currentExpiration && currentExpiration > now ? currentExpiration : now;
    const newExpirationDate = new Date(startDate.getTime() + (premiumPackage[0].duration_days * 24 * 60 * 60 * 1000));

    // Start transaction
    const newBalance = userBalance - packagePrice;

    // Update user balance and premium status
    await db.update(usersTable)
      .set({
        balance: newBalance.toString(),
        is_premium: true,
        premium_expires_at: newExpirationDate,
        updated_at: now,
      })
      .where(eq(usersTable.id, userId))
      .execute();

    // Create transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'purchase',
        amount: packagePrice.toString(),
        description: `Premium package purchase: ${premiumPackage[0].name}`,
        premium_package_id: packageId,
        status: 'completed',
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount),
    };
  } catch (error) {
    console.error('Premium purchase failed:', error);
    throw error;
  }
};