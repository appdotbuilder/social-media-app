import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getNotifications = async (userId: number): Promise<Notification[]> => {
  try {
    // Fetch notifications for the user, ordered by newest first
    const results = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    // Mark all notifications as read
    if (results.length > 0) {
      await db.update(notificationsTable)
        .set({ is_read: true })
        .where(eq(notificationsTable.user_id, userId))
        .execute();
    }

    // Return notifications with is_read set to true (since we just marked them as read)
    return results.map(notification => ({
      ...notification,
      is_read: true, // Reflect the updated status
      created_at: notification.created_at
    }));
  } catch (error) {
    console.error('Get notifications failed:', error);
    throw error;
  }
};