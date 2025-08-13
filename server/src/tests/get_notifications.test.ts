import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notificationsTable } from '../db/schema';
import { getNotifications } from '../handlers/get_notifications';
import { eq } from 'drizzle-orm';

describe('getNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no notifications', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const result = await getNotifications(user.id);

    expect(result).toEqual([]);
  });

  it('should return notifications ordered by newest first', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create multiple notifications with different timestamps
    const [notification1] = await db.insert(notificationsTable)
      .values({
        user_id: user.id,
        type: 'like',
        title: 'First Notification',
        message: 'Someone liked your post',
        related_id: 1
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [notification2] = await db.insert(notificationsTable)
      .values({
        user_id: user.id,
        type: 'comment',
        title: 'Second Notification',
        message: 'Someone commented on your post',
        related_id: 2
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const [notification3] = await db.insert(notificationsTable)
      .values({
        user_id: user.id,
        type: 'follow',
        title: 'Third Notification',
        message: 'Someone followed you',
        related_id: 3
      })
      .returning()
      .execute();

    const result = await getNotifications(user.id);

    expect(result).toHaveLength(3);
    // Should be ordered by newest first
    expect(result[0].title).toEqual('Third Notification');
    expect(result[1].title).toEqual('Second Notification');
    expect(result[2].title).toEqual('First Notification');

    // Verify proper field types and values
    expect(result[0].id).toBeDefined();
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].type).toEqual('follow');
    expect(result[0].title).toEqual('Third Notification');
    expect(result[0].message).toEqual('Someone followed you');
    expect(result[0].related_id).toEqual(3);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].is_read).toBe(true); // Should be marked as read
  });

  it('should mark notifications as read when fetched', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create notifications (default is_read is false)
    await db.insert(notificationsTable)
      .values([
        {
          user_id: user.id,
          type: 'like',
          title: 'Test Notification 1',
          message: 'Test message 1',
          related_id: 1
        },
        {
          user_id: user.id,
          type: 'comment',
          title: 'Test Notification 2',
          message: 'Test message 2',
          related_id: 2
        }
      ])
      .execute();

    // Verify notifications are initially unread
    const unreadNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, user.id))
      .execute();
    
    expect(unreadNotifications.every(n => n.is_read === false)).toBe(true);

    // Fetch notifications
    const result = await getNotifications(user.id);

    // Verify all returned notifications are marked as read
    expect(result.every(n => n.is_read === true)).toBe(true);

    // Verify notifications are marked as read in database
    const readNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, user.id))
      .execute();
    
    expect(readNotifications.every(n => n.is_read === true)).toBe(true);
  });

  it('should only return notifications for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        password_hash: 'hashedpassword1',
        full_name: 'Test User 1'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword2',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();

    // Create notifications for both users
    await db.insert(notificationsTable)
      .values([
        {
          user_id: user1.id,
          type: 'like',
          title: 'User 1 Notification',
          message: 'Message for user 1',
          related_id: 1
        },
        {
          user_id: user2.id,
          type: 'comment',
          title: 'User 2 Notification',
          message: 'Message for user 2',
          related_id: 2
        }
      ])
      .execute();

    // Get notifications for user1
    const user1Notifications = await getNotifications(user1.id);

    expect(user1Notifications).toHaveLength(1);
    expect(user1Notifications[0].title).toEqual('User 1 Notification');
    expect(user1Notifications[0].user_id).toEqual(user1.id);

    // Get notifications for user2
    const user2Notifications = await getNotifications(user2.id);

    expect(user2Notifications).toHaveLength(1);
    expect(user2Notifications[0].title).toEqual('User 2 Notification');
    expect(user2Notifications[0].user_id).toEqual(user2.id);
  });

  it('should handle all notification types correctly', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create notifications of different types
    await db.insert(notificationsTable)
      .values([
        {
          user_id: user.id,
          type: 'like',
          title: 'Like Notification',
          message: 'Someone liked your post',
          related_id: 1
        },
        {
          user_id: user.id,
          type: 'comment',
          title: 'Comment Notification',
          message: 'Someone commented on your post',
          related_id: 2
        },
        {
          user_id: user.id,
          type: 'follow',
          title: 'Follow Notification',
          message: 'Someone followed you',
          related_id: 3
        },
        {
          user_id: user.id,
          type: 'share',
          title: 'Share Notification',
          message: 'Someone shared your post',
          related_id: 4
        },
        {
          user_id: user.id,
          type: 'premium',
          title: 'Premium Notification',
          message: 'Your premium subscription expires soon',
          related_id: null
        },
        {
          user_id: user.id,
          type: 'admin',
          title: 'Admin Notification',
          message: 'System maintenance scheduled',
          related_id: null
        }
      ])
      .execute();

    const result = await getNotifications(user.id);

    expect(result).toHaveLength(6);

    // Verify all notification types are handled
    const types = result.map(n => n.type);
    expect(types).toContain('like');
    expect(types).toContain('comment');
    expect(types).toContain('follow');
    expect(types).toContain('share');
    expect(types).toContain('premium');
    expect(types).toContain('admin');

    // Verify nullable related_id is handled correctly
    const premiumNotification = result.find(n => n.type === 'premium');
    const adminNotification = result.find(n => n.type === 'admin');
    expect(premiumNotification?.related_id).toBeNull();
    expect(adminNotification?.related_id).toBeNull();
  });

  it('should not mark notifications as read when no notifications exist', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // This should not throw an error even when no notifications exist
    const result = await getNotifications(user.id);

    expect(result).toEqual([]);
  });
});