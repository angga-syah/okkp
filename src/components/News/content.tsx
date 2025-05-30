// E:\kp\kp normal\kp normal\src\components\News\content.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/sb_client';
import { toast } from 'react-hot-toast';
import { AuthGuard } from '@/components/Common/AuthGuard';
// Define interfaces for type safety
interface RecentArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  published_at?: string;
}

interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  categories: number;
  recentArticles: RecentArticle[]; // Now properly typed as an array of RecentArticle
}

export default function ContentEditorDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    categories: 0,
    recentArticles: [] // Initialize as empty array of RecentArticle
  });

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchStats() {
      try {
        // Get total articles count
        const { count: totalCount, error: totalError } = await supabaseClient
          .from('news_articles')
          .select('*', { count: 'exact', head: true });

        // Get published articles count
        const { count: publishedCount, error: publishedError } = await supabaseClient
          .from('news_articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published');

        // Get draft articles count
        const { count: draftCount, error: draftError } = await supabaseClient
          .from('news_articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');

        // Get recent articles
        const { data: recentArticles, error: recentError } = await supabaseClient
          .from('news_articles')
          .select('id, title, slug, status, created_at, published_at')
          .order('created_at', { ascending: false })
          .limit(5);

        // Get unique categories
        const { data: categoriesData, error: categoriesError } = await supabaseClient
          .from('news_articles')
          .select('categories');

        if (totalError || publishedError || draftError || recentError || categoriesError) {
          throw new Error('Error fetching dashboard data');
        }

        // Count unique categories
        const allCategories = categoriesData
          ?.flatMap(article => article.categories || []) || [];
        const uniqueCategories = Array.from(new Set(allCategories));

        setStats({
          totalArticles: totalCount || 0,
          publishedArticles: publishedCount || 0,
          draftArticles: draftCount || 0,
          categories: uniqueCategories.length,
          recentArticles: recentArticles as RecentArticle[] || [] // Cast to RecentArticle[]
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not published';
    
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle logout
  const handleLogout = () => {
    window.location.href = '/api/auth/logout?callbackUrl=' + encodeURIComponent('/wall-e?reason=manual_logout');
  };

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Content Editor Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {session?.user?.name || session?.user?.email}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <span className="text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-lg">
            Content Editor
          </span>
          
          <button
            onClick={handleLogout}
            className="flex items-center bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Articles</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalArticles}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.publishedArticles}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Drafts</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.draftArticles}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.categories}</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Content Management Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-1"
            >
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Content Management</h2>

<div className="space-y-4">
  {/* Link to the news management page based on your file structure */}
  <Link href="/wali/news" className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mr-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8m-2 0v10M9 13h.01M9 17h.01M13 13h.01M13 17h.01" />
      </svg>
    </div>
    <div>
      <p className="font-medium text-gray-800 dark:text-white">Manage News Articles</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Create, edit, and publish articles</p>
    </div>
  </Link>
  
  {/* Public news page view */}
  <Link href="/news" target="_blank" className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mr-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </div>
    <div>
      <p className="font-medium text-gray-800 dark:text-white">View Public News Page</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">See how articles appear to visitors</p>
    </div>
  </Link>
  
  {/* Create new article link */}
  <Link href="/wali/news?action=create" className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
    <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 mr-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
    <div>
      <p className="font-medium text-gray-800 dark:text-white">Create New Article</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Start writing a new post</p>
    </div>
  </Link>
</div>
              
              {/* Content Guidelines */}
              <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <h3 className="font-medium text-gray-800 dark:text-white mb-2">Content Guidelines</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-5 list-disc">
                  <li>Use clear, concise titles (50-60 characters)</li>
                  <li>Include a descriptive excerpt (150-160 characters)</li>
                  <li>Add relevant categories for better organization</li>
                  <li>Use high-quality featured images (1200×630px ideal)</li>
                  <li>Preview content before publishing</li>
                </ul>
              </div>
            </motion.div>
            
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-2"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recent Articles</h2>
                <Link href="/wali/news" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View all
                </Link>
              </div>
              
              {stats.recentArticles.length === 0 ? (
                <div className="text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8m-2 0v10M9 13h.01M9 17h.01M13 13h.01M13 17h.01" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">No articles created yet.</p>
                  <Link href="/wali/news?action=create" className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Create your first article
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.recentArticles.map((article) => (
                        <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{article.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{article.slug}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              article.status === 'published' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {article.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(article.created_at)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link href={`/wali/news?id=${article.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                Edit
                              </Link>
                              <Link href={`/news/${article.slug}`} target="_blank" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
    </AuthGuard>);
}