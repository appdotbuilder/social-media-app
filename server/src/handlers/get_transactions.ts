import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTransactions = async (userId?: number): Promise<Transaction[]> => {
  try {
    // Build query conditionally to maintain proper typing
    const results = userId !== undefined
      ? await db.select()
          .from(transactionsTable)
          .where(eq(transactionsTable.user_id, userId))
          .orderBy(desc(transactionsTable.created_at))
          .execute()
      : await db.select()
          .from(transactionsTable)
          .orderBy(desc(transactionsTable.created_at))
          .execute();

    // Convert numeric fields to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
};