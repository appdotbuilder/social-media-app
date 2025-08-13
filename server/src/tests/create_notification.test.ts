import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { createNotification } from '../handlers/create_notification';
import { eq } from 'drizzle-orm';

// Test user for foreign key reference
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
};

// Test notification inputs
const likeNotificationInput: CreateNotificationInput = {
  user_id: 1,
  type: 'like',
  title: 'New Like',
  message: 'Someone liked your post',
  related_id: 123,
};

const followNotificationInput: CreateNotificationInput = {
  user_id: 1,
  type: 'follow',
  title: 'New Follower',
  message: 'Someone started following you',
  related_id: 456,
};

const adminNotificationInput: CreateNotificationInput = {
  user_id: 1,
  type: 'admin',
  title: 'Admin Notice',
  message: 'Important system update',
  related_id: null,
};

describe('createNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user for foreign key reference
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  it('should create a like notification', async () => {
    const result = await createNotification(likeNotificationInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.type).toEqual('like');
    expect(result.title).toEqual('New Like');
    expect(result.message).toEqual('Someone liked your post');
    expect(result.related_id).toEqual(123);
    expect(result.is_read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a follow notification', async () => {
    const result = await createNotification(followNotificationInput);

    expect(result.user_id).toEqual(1);
    expect(result.type).toEqual('follow');
    expect(result.title).toEqual('New Follower');
    expect(result.message).toEqual('Someone started following you');
    expect(result.related_id).toEqual(456);
    expect(result.is_read).toEqual(false);
  });

  it('should create an admin notification with null related_id', async () => {
    const result = await createNotification(adminNotificationInput);

    expect(result.user_id).toEqual(1);
    expect(result.type).toEqual('admin');
    expect(result.title).toEqual('Admin Notice');
    expect(result.message).toEqual('Important system update');
    expect(result.related_id).toBeNull();
    expect(result.is_read).toEqual(false);
  });

  it('should save notification to database', async () => {
    const result = await createNotification(likeNotificationInput);

    // Query database to verify notification was saved
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    const savedNotification = notifications[0];
    
    expect(savedNotification.user_id).toEqual(1);
    expect(savedNotification.type).toEqual('like');
    expect(savedNotification.title).toEqual('New Like');
    expect(savedNotification.message).toEqual('Someone liked your post');
    expect(savedNotification.related_id).toEqual(123);
    expect(savedNotification.is_read).toEqual(false);
    expect(savedNotification.created_at).toBeInstanceOf(Date);
  });

  it('should create notifications for all notification types', async () => {
    const notificationTypes: Array<CreateNotificationInput['type']> = [
      'like', 'comment', 'follow', 'share', 'premium', 'admin'
    ];

    for (const type of notificationTypes) {
      const input: CreateNotificationInput = {
        user_id: 1,
        type: type,
        title: `Test ${type} notification`,
        message: `This is a ${type} notification`,
        related_id: type === 'admin' ? null : 999,
      };

      const result = await createNotification(input);
      
      expect(result.type).toEqual(type);
      expect(result.title).toEqual(`Test ${type} notification`);
      expect(result.message).toEqual(`This is a ${type} notification`);
      expect(result.is_read).toEqual(false);
    }

    // Verify all notifications were created
    const allNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(allNotifications).toHaveLength(notificationTypes.length);
  });

  it('should handle notification without related_id', async () => {
    const inputWithoutRelatedId: CreateNotificationInput = {
      user_id: 1,
      type: 'premium',
      title: 'Premium Upgrade',
      message: 'Your premium subscription is active',
      // related_id is optional and omitted
    };

    const result = await createNotification(inputWithoutRelatedId);

    expect(result.user_id).toEqual(1);
    expect(result.type).toEqual('premium');
    expect(result.related_id).toBeNull();
  });

  it('should create multiple notifications for same user', async () => {
    // Create multiple notifications
    const notification1 = await createNotification(likeNotificationInput);
    const notification2 = await createNotification(followNotificationInput);
    const notification3 = await createNotification(adminNotificationInput);

    // All should have different IDs
    expect(notification1.id).not.toEqual(notification2.id);
    expect(notification2.id).not.toEqual(notification3.id);
    expect(notification1.id).not.toEqual(notification3.id);

    // All should be for the same user
    expect(notification1.user_id).toEqual(1);
    expect(notification2.user_id).toEqual(1);
    expect(notification3.user_id).toEqual(1);

    // Verify all saved to database
    const userNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, 1))
      .execute();

    expect(userNotifications).toHaveLength(3);
  });

  it('should set correct default values', async () => {
    const result = await createNotification(likeNotificationInput);

    // Verify default values
    expect(result.is_read).toEqual(false); // Default should be false
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Verify created_at is recent (within last second)
    const now = new Date();
    const timeDiff = now.getTime() - result.created_at.getTime();
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second
  });
});