"use client";

import React from 'react';
import { useSidebar } from '@/lib/sidebar-context';
import Sidebar from '@/components/layout/sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { isOpen } = useSidebar();

  return (
    <div className="flex min-h-screen">

      <div className="flex flex-1 relative">

        <Sidebar />
        

        <main className={`main-content flex-1 transition-all duration-300 ease-in-out ${
          isOpen ? 'md:ml-64' : 'md:ml-16'
        }`}>
  
          <div
            className="fixed inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute left-0 top-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl dark:from-amber-900/10 dark:to-orange-900/5" />
            <div className="absolute right-0 bottom-1/4 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-orange-100/20 to-amber-200/10 blur-3xl dark:from-orange-900/10 dark:to-amber-900/5" />
          </div>


          <div className="relative min-h-screen flex flex-col">
            <div className="flex-1 p-4 md:p-8">
              {children}
            </div>
            

            <footer className="relative border-t border-amber-200/30 dark:border-amber-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center gap-4">

                  <div className="flex items-center gap-2">
                    <img
                      src="/logo.png"
                      alt="Athemaria Logo"
                      className="h-6 w-6 object-contain"
                    />
                    <span className="text-lg font-serif font-medium text-amber-900 dark:text-amber-100">
                      Athemaria
                    </span>
                  </div>


                  <div className="text-sm text-amber-700/60 dark:text-amber-300/60">
                    © {new Date().getFullYear()} Athemaria. All rights
                    reserved.
                  </div>


                  <div className="w-20 h-0.5 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 dark:from-amber-700 dark:to-amber-600 opacity-50" />
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}