import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Send, 
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  MoreVertical,
  Loader2,
  PlusCircle
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Post, User, CreatePostInput } from '../../../server/src/schema';

interface FeedProps {
  posts: Post[];
  currentUser: User;
  onPostsUpdate: () => void;
  isLoading: boolean;
}

export function Feed({ posts, currentUser, onPostsUpdate, isLoading }: FeedProps) {
  const [newPost, setNewPost] = useState<CreatePostInput>({
    user_id: currentUser.id,
    content: '',
    media_urls: null,
    media_type: 'text',
    link_url: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.content && !newPost.media_urls && !newPost.link_url) return;
    
    setIsSubmitting(true);
    try {
      await trpc.createPost.mutate(newPost);
      setNewPost({
        user_id: currentUser.id,
        content: '',
        media_urls: null,
        media_type: 'text',
        link_url: null
      });
      setShowCreatePost(false);
      onPostsUpdate();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await trpc.deleteLike.mutate({ userId: currentUser.id, postId });
      } else {
        await trpc.createLike.mutate({ user_id: currentUser.id, post_id: postId });
      }
      onPostsUpdate();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleShare = async (postId: number) => {
    try {
      await trpc.createShare.mutate({ user_id: currentUser.id, post_id: postId });
      onPostsUpdate();
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'photo': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'link': return <LinkIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={currentUser.profile_picture_url || undefined} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                {currentUser.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              className="flex-1 justify-start text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setShowCreatePost(true)}
            >
              What's on your mind, {currentUser.full_name.split(' ')[0]}? ✨
            </Button>
          </div>

          {showCreatePost && (
            <form onSubmit={handleSubmitPost} className="mt-4 space-y-4">
              <Textarea
                placeholder="Share something amazing with the world! 🌟"
                value={newPost.content || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNewPost((prev: CreatePostInput) => ({ ...prev, content: e.target.value || null }))
                }
                className="min-h-[120px] resize-none border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
                maxLength={2000}
                autoFocus
              />

              <div className="flex items-center gap-4">
                <Select 
                  value={newPost.media_type} 
                  onValueChange={(value: 'text' | 'photo' | 'video' | 'link') => 
                    setNewPost((prev: CreatePostInput) => ({ ...prev, media_type: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">📝 Text</SelectItem>
                    <SelectItem value="photo">📸 Photo</SelectItem>
                    <SelectItem value="video">🎥 Video</SelectItem>
                    <SelectItem value="link">🔗 Link</SelectItem>
                  </SelectContent>
                </Select>

                {newPost.media_type === 'link' && (
                  <Input
                    placeholder="Enter link URL..."
                    value={newPost.link_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPost((prev: CreatePostInput) => ({ ...prev, link_url: e.target.value || null }))
                    }
                    className="flex-1"
                  />
                )}

                {(newPost.media_type === 'photo' || newPost.media_type === 'video') && (
                  <Input
                    placeholder="Enter media URLs (comma separated)..."
                    value={newPost.media_urls?.join(', ') || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPost((prev: CreatePostInput) => ({ 
                        ...prev, 
                        media_urls: e.target.value ? e.target.value.split(',').map(url => url.trim()) : null 
                      }))
                    }
                    className="flex-1"
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {newPost.content?.length || 0} / 2000 characters
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreatePost(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    disabled={isSubmitting || (!newPost.content && !newPost.media_urls && !newPost.link_url)}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Posting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Share Post
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading posts...
          </div>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PlusCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No posts yet! 📝
            </h3>
            <p className="text-gray-500">
              Be the first to share something amazing with the community.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.map((post: Post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">User #{post.user_id}</h4>
                        {Math.random() > 0.5 && (
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                            ✨ Premium
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>@user{post.user_id}</span>
                        <span>•</span>
                        <span>{formatDate(post.created_at)}</span>
                        {post.media_type !== 'text' && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              {getMediaIcon(post.media_type)}
                              <span className="capitalize">{post.media_type}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {/* Post Content */}
                {post.content && (
                  <div className="mb-4">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>
                )}

                {/* Media/Link Content */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {post.media_urls.map((url: string, index: number) => (
                      <div key={index} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border">
                        <p className="text-sm text-blue-600 dark:text-blue-400 truncate">{url}</p>
                      </div>
                    ))}
                  </div>
                )}

                {post.link_url && (
                  <div className="mb-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <LinkIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          External Link
                        </span>
                      </div>
                      <a 
                        href={post.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {post.link_url}
                      </a>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Post Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleLike(post.id, false)} // TODO: Implement proper like status
                    >
                      <Heart className="h-4 w-4" />
                      <span>{post.likes_count}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.comments_count}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-gray-600 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                      onClick={() => handleShare(post.id)}
                    >
                      <Share2 className="h-4 w-4" />
                      <span>{post.shares_count}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}