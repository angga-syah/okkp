//E:\kp\New folder\src\app\wali\page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import Image from "next/image";

// Import ThemeToggler directly as it's a small component
import ThemeToggler from "@/components/Header/ThemeToggler";

// Dynamically import the Dashboard component with a loading state
const DashboardPage = dynamic(() => import("@/components/Wali"), {
  loading: () => <LoadingDashboard />,
  ssr: false // Disable server-side rendering to reduce server load
});

// Loading component for the dashboard
const LoadingDashboard = () => (
  <div className="w-full h-screen flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
    </div>
  </div>
);

interface UserSession {
  user: {
    email: string;
    role?: string;
    image?: string;
  };
}

const Wali = () => {
  const { data: session, status } = useSession() as { data: UserSession | null, status: string };
  const [navbarOpen, setNavbarOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  
  // Only run client-side
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle navbar toggle
  const navbarToggleHandler = () => {
    setNavbarOpen((prev) => !prev);
  };

  // Add scroll detection for enhanced header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarOpen && !(event.target as Element).closest(".navbar-container")) {
        setNavbarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navbarOpen]);

  // Close mobile menu on route change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setNavbarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // User profile component
  const UserProfile = ({ isMobile = false }) => {
    if (!session?.user) return null;
    
    return (
      <div className={`flex items-center ${isMobile ? 'p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg' : 'mr-4 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full'}`}>
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full">
          {session.user.image ? (
            <Image
              src={session.user.image} 
              alt="User"
              width={32}
              height={32}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className={`ml-2 ${isMobile ? 'text-sm' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300`}>
          {session.user.email}
          {/* Only show role if it exists and is not 'content_editor' */}
          {session.user.role && session.user.role !== 'content_editor' && (
            <div className={`${isMobile ? 'text-xs' : 'ml-1 inline text-xs'} text-gray-500 dark:text-gray-400`}>
              {session.user.role}
            </div>
          )}
        </div>
      </div>
    );
  };

  // If we're in the loading state, show a full-screen loader
  if (status === "loading" || !mounted) {
    return <LoadingDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
      {/* Enhanced header with transition effects */}
      <header 
        className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 
        ${scrolled 
          ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg py-2" 
          : "bg-white dark:bg-gray-900 shadow-md py-3"}`}
      >
        <div className="container max-w-full mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo and title section */}
            <div className="flex items-center">
              <div className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Fortuna Dashboard
              </div>
            </div>

            {/* Desktop navigation - hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* User info - show when logged in */}
              {session?.user && <UserProfile />}
              
              <ThemeToggler />
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center navbar-container">
              {/* User badge - Mobile */}
              {session?.user && (
                <div className="flex items-center mr-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full">
                    {session.user.image ? (
                      <Image 
                        src={session.user.image} 
                        alt="User"
                        width={32}
                        height={32}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              
              <ThemeToggler />
              <button
                onClick={navbarToggleHandler}
                aria-label="Toggle Menu"
                className="ml-3 p-2 rounded-lg text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                    navbarOpen ? "rotate-45 translate-y-1.5" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 my-1 ${
                    navbarOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                    navbarOpen ? "-rotate-45 -translate-y-1.5" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation menu */}
      <div 
        className={`fixed z-40 top-[60px] left-0 w-full bg-white dark:bg-gray-900 shadow-md lg:hidden transition-transform duration-300 transform ${
          navbarOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          {session?.user && <UserProfile isMobile={true} />}
        </div>
      </div>

      {/* Main content with proper spacing and wider container */}
      <main className="container max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-20 pb-12">
        <Suspense fallback={<LoadingDashboard />}>
          <DashboardPage />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 py-4 shadow-inner">
        <div className="container max-w-full mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-2 sm:mb-0">
              © {new Date().getFullYear()} Fortuna Admin Dashboard
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Version 1.0.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Wali;