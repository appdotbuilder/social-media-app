import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq, desc, asc, ilike, and, type SQL } from 'drizzle-orm';

export interface GetUsersInput {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  is_premium?: boolean;
  is_admin?: boolean;
  order_by?: 'created_at' | 'username' | 'followers_count';
  order_direction?: 'asc' | 'desc';
}

export const getUsers = async (input: GetUsersInput = {}): Promise<User[]> => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      is_active,
      is_premium,
      is_admin,
      order_by = 'created_at',
      order_direction = 'desc'
    } = input;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (search) {
      conditions.push(
        ilike(usersTable.username, `%${search}%`)
      );
    }

    if (is_active !== undefined) {
      conditions.push(eq(usersTable.is_active, is_active));
    }

    if (is_premium !== undefined) {
      conditions.push(eq(usersTable.is_premium, is_premium));
    }

    if (is_admin !== undefined) {
      conditions.push(eq(usersTable.is_admin, is_admin));
    }

    // Build the complete query in one go
    const baseQuery = db.select().from(usersTable);

    // Apply all conditions and execute query
    let results;
    
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      
      if (order_direction === 'desc') {
        results = await baseQuery
          .where(whereClause)
          .orderBy(desc(usersTable[order_by]))
          .limit(limit)
          .offset(offset)
          .execute();
      } else {
        results = await baseQuery
          .where(whereClause)
          .orderBy(asc(usersTable[order_by]))
          .limit(limit)
          .offset(offset)
          .execute();
      }
    } else {
      if (order_direction === 'desc') {
        results = await baseQuery
          .orderBy(desc(usersTable[order_by]))
          .limit(limit)
          .offset(offset)
          .execute();
      } else {
        results = await baseQuery
          .orderBy(asc(usersTable[order_by]))
          .limit(limit)
          .offset(offset)
          .execute();
      }
    }

    // Convert numeric fields from strings to numbers
    return results.map(user => ({
      ...user,
      balance: parseFloat(user.balance)
    }));
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};