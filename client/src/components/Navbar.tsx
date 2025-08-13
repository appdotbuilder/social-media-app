import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Home, 
  User as UserIcon, 
  Bell, 
  Crown, 
  Shield, 
  LogOut, 
  Moon, 
  Sun,
  Search,
  Menu
} from 'lucide-react';
import type { User } from '../../../server/src/schema';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function Navbar({ 
  user, 
  onLogout, 
  onTabChange, 
  activeTab, 
  isDarkMode, 
  onToggleTheme 
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'premium', label: 'Premium', icon: Crown },
    ...(user.is_admin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              SocialHub
            </h1>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users, posts..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </form>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.id === 'notifications' && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                    3
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* User Menu & Controls */}
          <div className="flex items-center gap-2">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                ${user.balance.toFixed(2)}
              </span>
            </div>

            {/* Premium Badge */}
            {user.is_premium && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                ✨ Premium
              </Badge>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="hidden sm:flex"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="hidden sm:flex text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{user.full_name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          ${user.balance.toFixed(2)}
                        </span>
                        {user.is_premium && (
                          <Badge className="text-xs">Premium</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Search - Mobile */}
                  <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleSearch} className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </form>
                  </div>

                  {/* Navigation Items */}
                  <div className="flex-1 py-4 space-y-2">
                    {navItems.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        className={`w-full justify-start gap-3 ${
                          activeTab === item.id 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                            : ''
                        }`}
                        onClick={() => onTabChange(item.id)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {item.id === 'notifications' && (
                          <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                            3
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={onToggleTheme}
                    >
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={onLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}