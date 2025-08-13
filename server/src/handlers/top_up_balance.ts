import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type TopUpInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const topUpBalance = async (input: TopUpInput): Promise<Transaction> => {
  try {
    return await db.transaction(async (tx) => {
      // Verify user exists
      const user = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error(`User with id ${input.user_id} not found`);
      }

      // Create transaction record
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          user_id: input.user_id,
          type: 'topup',
          amount: input.amount.toString(), // Convert number to string for numeric column
          description: `Balance top-up of $${input.amount}`,
          premium_package_id: null,
          status: 'completed' // Assuming successful payment for this implementation
        })
        .returning()
        .execute();

      const transaction = transactionResult[0];

      // Update user balance
      const currentBalance = parseFloat(user[0].balance);
      const newBalance = currentBalance + input.amount;

      await tx.update(usersTable)
        .set({
          balance: newBalance.toString(), // Convert number to string for numeric column
          updated_at: new Date()
        })
        .where(eq(usersTable.id, input.user_id))
        .execute();

      // Return transaction with numeric conversion
      return {
        ...transaction,
        amount: parseFloat(transaction.amount) // Convert string back to number
      };
    });
  } catch (error) {
    console.error('Top-up balance failed:', error);
    throw error;
  }
};