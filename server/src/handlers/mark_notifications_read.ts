import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export const markNotificationsRead = async (userId: number, notificationIds?: number[]): Promise<{ success: boolean }> => {
  try {
    // Build update query conditions
    const conditions = [eq(notificationsTable.user_id, userId)];
    
    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      conditions.push(inArray(notificationsTable.id, notificationIds));
    }
    
    // Update notifications to mark them as read
    await db.update(notificationsTable)
      .set({ is_read: true })
      .where(and(...conditions))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Mark notifications read failed:', error);
    throw error;
  }
};