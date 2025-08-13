import { db } from '../db';
import { followsTable, usersTable } from '../db/schema';
import { type CreateFollowInput, type Follow } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const createFollow = async (input: CreateFollowInput): Promise<Follow> => {
  try {
    // Prevent self-following
    if (input.follower_id === input.followed_id) {
      throw new Error('Users cannot follow themselves');
    }

    // Check if both users exist
    const users = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, input.follower_id),
          eq(usersTable.is_active, true)
        )
      )
      .union(
        db.select({ id: usersTable.id })
          .from(usersTable)
          .where(
            and(
              eq(usersTable.id, input.followed_id),
              eq(usersTable.is_active, true)
            )
          )
      )
      .execute();

    if (users.length !== 2) {
      throw new Error('One or both users do not exist or are inactive');
    }

    // Check if follow relationship already exists
    const existingFollow = await db.select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, input.follower_id),
          eq(followsTable.followed_id, input.followed_id)
        )
      )
      .execute();

    if (existingFollow.length > 0) {
      throw new Error('Follow relationship already exists');
    }

    // Use transaction to create follow and update counts atomically
    const result = await db.transaction(async (tx) => {
      // Create the follow relationship
      const followResult = await tx.insert(followsTable)
        .values({
          follower_id: input.follower_id,
          followed_id: input.followed_id,
        })
        .returning()
        .execute();

      // Update follower's following count
      await tx.update(usersTable)
        .set({
          following_count: sql`${usersTable.following_count} + 1`,
          updated_at: new Date(),
        })
        .where(eq(usersTable.id, input.follower_id))
        .execute();

      // Update followed user's followers count
      await tx.update(usersTable)
        .set({
          followers_count: sql`${usersTable.followers_count} + 1`,
          updated_at: new Date(),
        })
        .where(eq(usersTable.id, input.followed_id))
        .execute();

      return followResult[0];
    });

    return result;
  } catch (error) {
    console.error('Follow creation failed:', error);
    throw error;
  }
};