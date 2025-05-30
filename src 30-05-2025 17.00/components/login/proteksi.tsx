//E:\kp\New folder\src\components\login\proteksi.tsx
"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function SessionChecker() {
  const pathname = usePathname();
  const { status } = useSession();
  const checkingRef = useRef(false);

  useEffect(() => {
    // Only run on protected routes
    if (!pathname?.startsWith('/wali')) return;

    let intervalId: NodeJS.Timeout;

    const checkSession = async () => {
      // Prevent multiple concurrent session checks
      if (checkingRef.current) return;
      checkingRef.current = true;
      
      try {
        // Skip check if we're already in the logout process
        if (localStorage.getItem('logout-in-progress') === 'true') {
          checkingRef.current = false;
          return;
        }
        
        const res = await fetch('/api/cek-sesi', {
          // Prevent caching
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          // Add timestamp to prevent caching
          cache: 'no-store',
          next: { revalidate: 0 }
        });
        
        if (!res.ok) {
          throw new Error('Session check failed');
        }
        
        const data = await res.json();
        
        if (!data.isLoggedIn) {
       
          // If not logged in, trigger the logout event and redirect
          localStorage.setItem('logout-in-progress', 'true');
          localStorage.setItem('logout-event', Date.now().toString());
          
          // Force a redirect to login with session expired reason
          window.location.href = '/wall-e?reason=session_expired';
        }
      } catch (error) {
        console.error('Error checking session:', error);
        
        // On error, we should be cautious and redirect to login
        localStorage.setItem('logout-in-progress', 'true');
        window.location.href = '/wall-e?reason=session_error';
      } finally {
        checkingRef.current = false;
      }
    };
    
    // Check immediately on mount
    checkSession();
    
    // Then check session every minute
    intervalId = setInterval(checkSession, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [pathname]);
  
  // Also use the session status from useSession hook
  useEffect(() => {
    // Only run on protected routes
    if (!pathname?.startsWith('/wali')) return;
    
    if (status === 'unauthenticated') {
      // Set flags to coordinate with other components
      localStorage.setItem('logout-in-progress', 'true');
      localStorage.setItem('logout-event', Date.now().toString());
      
      // Redirect to login
      window.location.href = '/wall-e?reason=session_expired';
    }
  }, [status, pathname]);
  
  return null;
}