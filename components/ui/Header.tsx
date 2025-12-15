'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendRequests } from '@/hooks/useFriends';
import Button from './Button';
import { Avatar } from './Avatar';
import { supabase } from '@/lib/supabase/config';
import Logo from './Logo';
import { LayoutDashboard, Calendar, ListTodo, Users, AudioWaveform } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { incoming: pendingRequests } = useFriendRequests();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  // Load user profile picture
  useEffect(() => {
    if (!user?.id) return;

    const loadUserAvatar = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (data && (data as any).avatar_url) {
          setUserAvatarUrl((data as any).avatar_url);
        } else {
          // Fallback to Google/OAuth avatar
          setUserAvatarUrl(user?.user_metadata?.avatar_url || null);
        }
      } catch (error) {
        console.error('Error loading user avatar:', error);
        // Fallback to Google/OAuth avatar
        setUserAvatarUrl(user?.user_metadata?.avatar_url || null);
      }
    };

    loadUserAvatar();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Don't show header on auth pages or landing page
  if (!user || pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: 0 },
    { name: 'Calendar', path: '/calendar', icon: Calendar, badge: 0 },
    { name: 'Todos', path: '/todos', icon: ListTodo, badge: 0 },
    { name: 'Friends', path: '/friends', icon: Users, badge: pendingRequests.length },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="p-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
              <AudioWaveform className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Minute AI</span>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Profile Menu */}
            <div className="relative group">
              <button
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="User menu"
              >
                <Avatar
                  src={userAvatarUrl}
                  alt={user?.user_metadata?.full_name || user?.email || 'User'}
                  size="sm"
                />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="p-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
