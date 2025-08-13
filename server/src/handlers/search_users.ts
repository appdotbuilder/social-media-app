import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SearchUsersInput, type User } from '../schema';
import { like, or, desc, and, SQL, eq, ilike } from 'drizzle-orm';

export const searchUsers = async (input: SearchUsersInput): Promise<User[]> => {
  try {
    // Build search conditions
    const conditions: SQL<unknown>[] = [];
    
    // Add active user filter
    conditions.push(eq(usersTable.is_active, true));

    // Create fuzzy search patterns using case-insensitive ILIKE
    const searchPattern = `%${input.query}%`;
    
    // Search in both username and full_name fields (case insensitive)
    const searchCondition = or(
      ilike(usersTable.username, searchPattern),
      ilike(usersTable.full_name, searchPattern)
    );
    
    conditions.push(searchCondition!);

    // Apply pagination
    const page = input.page || 1;
    const limit = input.limit || 20;
    const offset = (page - 1) * limit;

    // Build and execute query in one chain to maintain type safety
    const results = await db.select()
      .from(usersTable)
      .where(and(...conditions))
      .orderBy(desc(usersTable.followers_count))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(user => ({
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    }));
  } catch (error) {
    console.error('User search failed:', error);
    throw error;
  }
};