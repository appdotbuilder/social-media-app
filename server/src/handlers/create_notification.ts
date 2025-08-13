import { type CreateNotificationInput, type Notification } from '../schema';

export const createNotification = async (input: CreateNotificationInput): Promise<Notification> => {
  // This is a placeholder implementation! Real code should be implemented here.
  // The goal of this handler is creating notifications for user interactions.
  // Should be called automatically when users like, comment, follow, etc.
  return Promise.resolve({
    id: 1,
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    message: input.message,
    is_read: false,
    related_id: input.related_id || null,
    created_at: new Date(),
  } as Notification);
};