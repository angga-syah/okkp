// src/components/Wali/hooks/useMobileDetection.ts
import { useState, useEffect, useCallback } from 'react';

interface UseMobileDetectionReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isCardView: boolean;
  setIsCardView: (value: boolean) => void;
  screenWidth: number;
  orientation: 'portrait' | 'landscape';
}

export function useMobileDetection(): UseMobileDetectionReturn {
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [isCardView, setIsCardView] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // Update screen dimensions and orientation
  const updateScreenInfo = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setScreenWidth(width);
    setOrientation(width > height ? 'landscape' : 'portrait');
    
    // Auto-set card view for mobile devices
    if (width < 768) {
      setIsCardView(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial setup
    updateScreenInfo();

    // Listen for resize events
    const handleResize = (): void => {
      updateScreenInfo();
    };

    // Listen for orientation change
    const handleOrientationChange = (): void => {
      // Small delay to ensure dimensions are updated
      setTimeout(updateScreenInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateScreenInfo]);

  // Determine device types based on screen width
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isCardView,
    setIsCardView,
    screenWidth,
    orientation,
  };
}