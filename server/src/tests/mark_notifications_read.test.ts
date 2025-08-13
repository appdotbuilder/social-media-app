import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notificationsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { markNotificationsRead } from '../handlers/mark_notifications_read';

describe('markNotificationsRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark all unread notifications as read when no specific IDs provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test notifications (some read, some unread)
    await db.insert(notificationsTable)
      .values([
        {
          user_id: userId,
          type: 'like',
          title: 'New Like',
          message: 'Someone liked your post',
          is_read: false
        },
        {
          user_id: userId,
          type: 'comment',
          title: 'New Comment',
          message: 'Someone commented on your post',
          is_read: false
        },
        {
          user_id: userId,
          type: 'follow',
          title: 'New Follower',
          message: 'Someone started following you',
          is_read: true // Already read
        }
      ])
      .execute();

    // Mark all unread notifications as read
    const result = await markNotificationsRead(userId);

    expect(result.success).toBe(true);

    // Verify all notifications for the user are now read
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .execute();

    expect(notifications).toHaveLength(3);
    notifications.forEach(notification => {
      expect(notification.is_read).toBe(true);
    });
  });

  it('should mark only specific notifications as read when IDs provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test notifications
    const notificationResults = await db.insert(notificationsTable)
      .values([
        {
          user_id: userId,
          type: 'like',
          title: 'New Like',
          message: 'Someone liked your post',
          is_read: false
        },
        {
          user_id: userId,
          type: 'comment',
          title: 'New Comment',
          message: 'Someone commented on your post',
          is_read: false
        },
        {
          user_id: userId,
          type: 'follow',
          title: 'New Follower',
          message: 'Someone started following you',
          is_read: false
        }
      ])
      .returning()
      .execute();

    const notificationIds = [notificationResults[0].id, notificationResults[2].id];

    // Mark specific notifications as read
    const result = await markNotificationsRead(userId, notificationIds);

    expect(result.success).toBe(true);

    // Verify only specified notifications are marked as read
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .execute();

    expect(notifications).toHaveLength(3);
    expect(notifications.find(n => n.id === notificationResults[0].id)?.is_read).toBe(true);
    expect(notifications.find(n => n.id === notificationResults[1].id)?.is_read).toBe(false); // Should remain unread
    expect(notifications.find(n => n.id === notificationResults[2].id)?.is_read).toBe(true);
  });

  it('should not affect notifications of other users', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 1'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create notifications for both users
    await db.insert(notificationsTable)
      .values([
        {
          user_id: user1Id,
          type: 'like',
          title: 'New Like',
          message: 'Someone liked your post',
          is_read: false
        },
        {
          user_id: user2Id,
          type: 'comment',
          title: 'New Comment',
          message: 'Someone commented on your post',
          is_read: false
        }
      ])
      .execute();

    // Mark notifications for user1 only
    const result = await markNotificationsRead(user1Id);

    expect(result.success).toBe(true);

    // Verify user1's notifications are read, user2's are not
    const user1Notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, user1Id))
      .execute();

    const user2Notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, user2Id))
      .execute();

    expect(user1Notifications[0].is_read).toBe(true);
    expect(user2Notifications[0].is_read).toBe(false);
  });

  it('should handle empty notification IDs array', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test notification
    await db.insert(notificationsTable)
      .values({
        user_id: userId,
        type: 'like',
        title: 'New Like',
        message: 'Someone liked your post',
        is_read: false
      })
      .execute();

    // Call with empty array (should mark all notifications)
    const result = await markNotificationsRead(userId, []);

    expect(result.success).toBe(true);

    // Verify notification is marked as read
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .execute();

    expect(notifications[0].is_read).toBe(true);
  });

  it('should handle user with no notifications', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Call without any notifications
    const result = await markNotificationsRead(userId);

    expect(result.success).toBe(true);

    // Verify no notifications exist
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should not mark notifications that do not belong to the user even if IDs are provided', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 1'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create notification for user2
    const user2NotificationResult = await db.insert(notificationsTable)
      .values({
        user_id: user2Id,
        type: 'like',
        title: 'New Like',
        message: 'Someone liked your post',
        is_read: false
      })
      .returning()
      .execute();

    const user2NotificationId = user2NotificationResult[0].id;

    // Try to mark user2's notification as read using user1's ID
    const result = await markNotificationsRead(user1Id, [user2NotificationId]);

    expect(result.success).toBe(true);

    // Verify user2's notification remains unread
    const user2Notification = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.user_id, user2Id),
          eq(notificationsTable.id, user2NotificationId)
        )
      )
      .execute();

    expect(user2Notification[0].is_read).toBe(false);
  });
});