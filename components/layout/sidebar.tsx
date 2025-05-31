"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/lib/sidebar-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, X, Menu } from 'lucide-react';

interface NavItem {
  name: string;
  icon: string;
  href: string;
  isAction?: boolean;
  requiresAuth?: boolean;
  hideWhenAuth?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isOpen, setIsOpen } = useSidebar();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      items: [
        { name: "Home", icon: "home", href: "/", requiresAuth: false },
        { name: "Write a Story", icon: "edit", href: "/create-story", requiresAuth: true },
        { name: "My Favorites", icon: "favorite", href: "/favorites", requiresAuth: true },
        { name: "Read Later", icon: "bookmark", href: "/read-later", requiresAuth: true },
        { name: "My Stories", icon: "book", href: "/my-stories", requiresAuth: true },
        { name: "Profile", icon: "person", href: "/profile", requiresAuth: true },
      ],
    },
  ];

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsOpen(false);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-transparent md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6 text-gray-900 dark:text-white drop-shadow-sm" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-in-out
          ${isMobile
            ? `${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
            : `${isOpen ? 'w-64' : 'w-16'} hover:w-64`
          }
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center group" onClick={closeMobileSidebar}>
                <img
                  src="/logo.png"
                  alt="Athemaria Logo"
                  className="h-7 w-7 object-contain transition-transform group-hover:scale-110 flex-shrink-0"
                />
                <span className={`ml-2.5 text-2xl font-serif font-medium text-amber-900 dark:text-amber-100 transition-opacity duration-300 ${
                  (!isOpen && !isMobile) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}>
                  Athemaria
                </span>
              </Link>
              
              {/* Mobile Close Button */}
              {isMobile && (
                <button
                  onClick={closeMobileSidebar}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>

            {/* Dark Mode Toggle - Only show when expanded */}
            <div className={`mt-4 transition-opacity duration-300 ${
              (!isOpen && !isMobile) ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
              <div className="flex items-center justify-center relative">
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="relative data-[state=checked]:bg-gray-700 data-[state=unchecked]:bg-amber-200"
                />
                <Sun className={`absolute left-1 top-1/2 transform -translate-y-1/2 h-3 w-3 transition-opacity pointer-events-none ${theme === 'dark' ? 'opacity-0' : 'opacity-100 text-amber-600'}`} />
                <Moon className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-3 w-3 transition-opacity pointer-events-none ${theme === 'dark' ? 'opacity-100 text-amber-100' : 'opacity-0'}`} />
              </div>
            </div>
          </div>

          {/* Search Input - Only show when expanded */}
          <div className={`mb-8 transition-opacity duration-300 ${
            (!isOpen && !isMobile) ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full py-2 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
              />
              <i className="material-icons absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">search</i>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-grow">
            {navSections.map((section, sectionIndex) => {
              const visibleItems = section.items.filter(item => {
                if (item.requiresAuth && !user) return false;
                if (item.hideWhenAuth && user) return false;
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={sectionIndex} className="mb-6">
                  {section.title && (
                    <h2 className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4 transition-opacity duration-300 ${
                      (!isOpen && !isMobile) ? 'opacity-0' : 'opacity-100'
                    }`}>
                      {section.title}
                    </h2>
                  )}
                  <ul>
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.name} className="mb-1.5">
                          <Link
                            href={item.href}
                            onClick={closeMobileSidebar}
                            className={`flex items-center transition-colors group relative
                              ${isActive
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                              }`}
                            title={!isOpen && !isMobile ? item.name : undefined}
                          >
                            {/* Container pour l'icône avec fond actif */}
                            <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-lg transition-colors ${
                              isActive
                                ? 'bg-gray-200 dark:bg-gray-700'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}>
                              <i className="material-icons text-xl leading-none">{item.icon}</i>
                            </div>
                            
                            {/* Texte du menu */}
                            <span className={`ml-3 text-sm font-medium transition-opacity duration-300 ${
                              (!isOpen && !isMobile) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                            }`}>
                              {item.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* User Authentication Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {user ? (
              <div className="flex items-center">
                <Link 
                  href="/profile" 
                  className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  onClick={closeMobileSidebar}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                      <circle cx="12" cy="8" r="5"/>
                      <path d="M20 21a8 8 0 0 0-16 0"/>
                    </svg>
                  </div>
                </Link>
                <div className={`ml-3 flex-grow transition-opacity duration-300 ${
                  (!isOpen && !isMobile) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}>
                  <Link
                    href="/profile"
                    onClick={closeMobileSidebar}
                    className="font-semibold text-sm text-gray-900 dark:text-white hover:underline focus:underline block"
                  >
                    {user.displayName || "User"}
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      logout();
                      closeMobileSidebar();
                    }}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-0 h-auto justify-start"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`flex flex-col gap-2 transition-opacity duration-300 ${
                (!isOpen && !isMobile) ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}>
                <Link href="/login" onClick={closeMobileSidebar}>
                  <Button variant="outline" className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-800">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={closeMobileSidebar}>
                  <Button className="w-full bg-amber-700 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-500">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
