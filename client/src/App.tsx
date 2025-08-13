import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Post, AuthResponse } from '../../server/src/schema';
import { Navbar } from '@/components/Navbar';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { Feed } from '@/components/Feed';
import { UserProfile } from '@/components/UserProfile';
import { AdminDashboard } from '@/components/AdminDashboard';
import { PremiumPackages } from '@/components/PremiumPackages';
import { Notifications } from '@/components/Notifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, Sun, Heart, MessageCircle, Share2, UserPlus } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [showLogin, setShowLogin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load posts
  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getPosts.query();
      setPosts(result);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const storedTheme = localStorage.getItem('theme');
    
    if (storedUser && storedToken) {
      setCurrentUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadPosts();
      loadUsers();
    }
  }, [currentUser, loadPosts, loadUsers]);

  const handleLogin = async (authResponse: AuthResponse) => {
    setCurrentUser(authResponse.user);
    setToken(authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    localStorage.setItem('token', authResponse.token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setActiveTab('feed');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // If not logged in, show auth forms
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="h-8 w-8 text-pink-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                SocialHub
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Connect, share, and explore together! 🌟
            </p>
          </div>
          
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <Tabs value={showLogin ? 'login' : 'register'} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger 
                      value="login" 
                      onClick={() => setShowLogin(true)}
                    >
                      Login
                    </TabsTrigger>
                    <TabsTrigger 
                      value="register" 
                      onClick={() => setShowLogin(false)}
                    >
                      Register
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="ml-2"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>

              {showLogin ? (
                <LoginForm onSuccess={handleLogin} />
              ) : (
                <RegisterForm onSuccess={() => setShowLogin(true)} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="feed" className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                {/* User sidebar */}
                <Card className="sticky top-20">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                      {currentUser.full_name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-semibold">{currentUser.full_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{currentUser.username}</p>
                    <div className="flex justify-center gap-4 mt-4 text-sm">
                      <div>
                        <span className="font-semibold">{currentUser.followers_count}</span>
                        <p className="text-gray-500">Followers</p>
                      </div>
                      <div>
                        <span className="font-semibold">{currentUser.following_count}</span>
                        <p className="text-gray-500">Following</p>
                      </div>
                    </div>
                    {currentUser.is_premium && (
                      <div className="mt-4">
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          ✨ Premium
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Feed
                  posts={posts}
                  currentUser={currentUser}
                  onPostsUpdate={loadPosts}
                  isLoading={isLoading}
                />
              </div>

              <div className="lg:col-span-1">
                {/* Suggestions and trending */}
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Suggested for you
                      </h3>
                      <div className="space-y-3">
                        {users.slice(0, 3).map((user: User) => (
                          <div key={user.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{user.full_name}</p>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              Follow
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Trending Topics</h3>
                      <div className="space-y-2">
                        <div className="hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded cursor-pointer">
                          <p className="font-medium text-sm">#ReactJS</p>
                          <p className="text-xs text-gray-500">12.5k posts</p>
                        </div>
                        <div className="hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded cursor-pointer">
                          <p className="font-medium text-sm">#WebDevelopment</p>
                          <p className="text-xs text-gray-500">8.3k posts</p>
                        </div>
                        <div className="hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded cursor-pointer">
                          <p className="font-medium text-sm">#TechNews</p>
                          <p className="text-xs text-gray-500">15.7k posts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <UserProfile user={currentUser} onUserUpdate={setCurrentUser} />
          </TabsContent>

          <TabsContent value="premium">
            <PremiumPackages currentUser={currentUser} onUserUpdate={setCurrentUser} />
          </TabsContent>

          <TabsContent value="notifications">
            <Notifications userId={currentUser.id} />
          </TabsContent>

          {currentUser.is_admin && (
            <TabsContent value="admin">
              <AdminDashboard />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default App;