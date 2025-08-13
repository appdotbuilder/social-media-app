import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Share2, 
  Crown, 
  Shield,
  Check,
  CheckCheck,
  Loader2,
  BellOff
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Notification } from '../../../server/src/schema';

interface NotificationsProps {
  userId: number;
}

export function Notifications({ userId }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getNotifications.query(userId);
      setNotifications(result);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationIds?: number[]) => {
    setIsMarkingRead(true);
    try {
      await trpc.markNotificationsRead.mutate({ 
        userId, 
        notificationIds 
      });
      setNotifications((prev: Notification[]) =>
        prev.map((notif: Notification) => 
          !notificationIds || notificationIds.includes(notif.id)
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-5 w-5 text-red-500" />;
      case 'comment': return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'follow': return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'share': return <Share2 className="h-5 w-5 text-purple-500" />;
      case 'premium': return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'admin': return <Shield className="h-5 w-5 text-orange-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30';
      case 'comment': return 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30';
      case 'follow': return 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800/30';
      case 'share': return 'bg-purple-50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800/30';
      case 'premium': return 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30';
      case 'admin': return 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30';
      default: return 'bg-gray-50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700/50';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const unreadNotifications = notifications.filter((n: Notification) => !n.is_read);
  const readNotifications = notifications.filter((n: Notification) => n.is_read);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay updated with your social activity 🔔
            </p>
          </div>
        </div>
        
        {unreadNotifications.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-500">
              {unreadNotifications.length} new
            </Badge>
            <Button
              onClick={() => markAsRead()}
              disabled={isMarkingRead}
              variant="outline"
              size="sm"
            >
              {isMarkingRead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Mark All Read
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading notifications...
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BellOff className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No notifications yet! 📬
            </h3>
            <p className="text-gray-500">
              When someone interacts with your content, you'll see notifications here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                New Notifications ({unreadNotifications.length})
              </h2>
              <div className="space-y-3">
                {unreadNotifications.map((notification: Notification) => (
                  <Card 
                    key={notification.id} 
                    className={`${getNotificationColor(notification.type)} border-l-4 hover:shadow-md transition-shadow`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {notification.title}
                              </h4>
                              <p className="text-gray-700 dark:text-gray-300 mt-1">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-sm text-gray-500 whitespace-nowrap">
                                {formatDate(notification.created_at)}
                              </span>
                              <Button
                                onClick={() => markAsRead([notification.id])}
                                disabled={isMarkingRead}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </Badge>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div>
              {unreadNotifications.length > 0 && <Separator className="my-8" />}
              <h2 className="text-xl font-semibold mb-4 text-gray-600 dark:text-gray-400">
                Earlier ({readNotifications.length})
              </h2>
              <div className="space-y-3">
                {readNotifications.map((notification: Notification) => (
                  <Card 
                    key={notification.id} 
                    className="opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1 opacity-60">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                {notification.title}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                                {notification.message}
                              </p>
                            </div>
                            <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs opacity-60">
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </Badge>
                            <CheckCheck className="h-3 w-3 text-green-500" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {notifications.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold">Notification Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage how you receive notifications and stay in control of your experience.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm">
                  ⚙️ Settings
                </Button>
                <Button variant="outline" size="sm">
                  🔕 Pause All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}