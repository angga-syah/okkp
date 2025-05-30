'use client';

import { useEffect } from 'react';

export default function Cf() {
  useEffect(() => {
    function handleCloudflareChallenge() {
      // Remove preload links for Cloudflare challenge resources to prevent console warnings
      const preloadLinks = document.querySelectorAll('link[rel="preload"][href*="cdn-cgi/challenge"]');
      preloadLinks.forEach(link => link.remove());
      
      // Add specific handling for Cloudflare resources
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'LINK' && 
                  node instanceof HTMLLinkElement && 
                  node.href.includes('cdn-cgi/challenge')) {
                // Ensure proper attributes for Cloudflare resources
                if (node.rel === 'preload') {
                  node.setAttribute('as', 'script');
                }
              }
            });
          }
        });
      });
      
      // Start observing the document with the configured parameters
      observer.observe(document.head, { childList: true, subtree: true });
      
      // Cleanup function to disconnect the observer
      return () => observer.disconnect();
    }

    // Call the function and store the cleanup
    const cleanup = handleCloudflareChallenge();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  return null;
}