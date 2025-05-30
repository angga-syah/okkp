//E:\kp\New folder\src\app\wali\news\page.tsx
"use client"

import dynamic from 'next/dynamic';

// Import the news management page with SSR disabled
const NewsManagementPage = dynamic(() => import('@/components/News/news-editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading news editor...</p>
      </div>
    </div>
  ),
});

export default function NewsPage() {
  return <NewsManagementPage />;
}