// E:\kp\New folder\src\components\Wali\hooks\useMobileDetection.ts
import { useState, useEffect } from 'react';

export function useMobileDetection() {
  const [isCardView, setIsCardView] = useState<boolean>(false);
  
  // Check for mobile view on component mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsCardView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  return { isCardView, setIsCardView };
}
