// src/components/News/index.tsx - Complete Real-time News Component
"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from "../Header/Bahasa";
import { supabaseClient, getRealtimeStatus, NewsArticle } from '@/lib/sb_client';
import { toast } from 'react-hot-toast';

interface NewsProps {
  initialPosts?: NewsArticle[];
}

// ✅ Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

const newPostVariants = {
  hidden: { opacity: 0, scale: 0.8, y: -50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

const Berita: React.FC<NewsProps> = ({ initialPosts = [] }) => {
  const { language } = useLanguage();
  
  // ✅ State management
  const [posts, setPosts] = useState<NewsArticle[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [newPostsCount, setNewPostsCount] = useState<number>(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  
  // ✅ Refs
  const subscriptionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Translation object
  const translations = {
    en: {
      title: "Latest News",
      description: "Latest information about our services and news related to foreign worker licensing in Indonesia.",
      searchPlaceholder: "Search news...",
      allCategories: "All",
      noResults: {
        title: "No news found",
        text: "Try using a different search keyword or select a different category."
      },
      readMore: "Read More",
      loading: "Loading latest news...",
      refresh: "Refresh",
      lastUpdated: "Last updated",
      realTime: "Real-time",
      connected: "Connected",
      disconnected: "Disconnected",
      connecting: "Connecting",
      newArticle: "New article published!",
      newArticles: "new articles available",
      checkForUpdates: "Check for updates",
      connectionIssue: "Connection issue, trying to reconnect..."
    },
    id: {
      title: "Berita Terbaru",
      description: "Informasi terkini tentang layanan kami dan berita terkait perizinan untuk Tenaga Kerja Asing di Indonesia.",
      searchPlaceholder: "Cari berita...",
      allCategories: "Semua",
      noResults: {
        title: "Tidak ada berita ditemukan",
        text: "Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda."
      },
      readMore: "Baca Selengkapnya",
      loading: "Memuat berita terbaru...",
      refresh: "Refresh",
      lastUpdated: "Terakhir diperbarui",
      realTime: "Real-time",
      connected: "Terhubung",
      disconnected: "Terputus",
      connecting: "Menghubungkan",
      newArticle: "Artikel baru dipublikasikan!",
      newArticles: "artikel baru tersedia",
      checkForUpdates: "Cek pembaruan",
      connectionIssue: "Masalah koneksi, mencoba menghubungkan ulang..."
    }
  };

  // ✅ Current language translations
  const t = translations[language as keyof typeof translations];

  // ✅ Manual fetch function
  const fetchLatestNews = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      
      const timestamp = new Date().getTime();
      const url = `/api/news/public?_t=${timestamp}&limit=50`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.articles && Array.isArray(data.articles)) {
        setPosts(data.articles);
        setLastFetchTime(new Date().toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US'));
        setNewPostsCount(0);
      }
      
    } catch (error) {
      console.error('Error fetching latest news:', error);
      toast.error('Gagal memuat berita terbaru');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [language]);

  // ✅ Handle new article from real-time
  const handleNewArticle = useCallback((newArticle: NewsArticle) => {
    setPosts(currentPosts => {
      // Check if article already exists
      const exists = currentPosts.some(post => post.id === newArticle.id);
      if (exists) return currentPosts;
      
      // Add new article at the top
      const updatedPosts = [newArticle, ...currentPosts];
      
      // Update counter
      setNewPostsCount(prev => prev + 1);
      
      // Show notification
      toast.success(t.newArticle, {
        duration: 5000,
        icon: '🔥',
        style: {
          borderRadius: '8px',
          background: '#10B981',
          color: '#fff',
        }
      });
      
      return updatedPosts;
    });
  }, [t.newArticle]);

  // ✅ Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabaseClient.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    try {
      console.log('🔄 Setting up real-time subscription...');
      
      const subscription = supabaseClient
        .channel('public:news_articles', {
          config: {
            presence: {
              key: `news_reader_${Date.now()}`
            }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'news_articles',
            filter: 'status=eq.published'
          },
          (payload) => {
            console.log('🔥 New article inserted:', payload.new);
            handleNewArticle(payload.new as NewsArticle);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'news_articles',
            filter: 'status=eq.published'
          },
          (payload) => {
            // Only handle newly published articles
            if (payload.old?.status !== 'published' && payload.new?.status === 'published') {
              console.log('🔥 Article published (updated):', payload.new);
              handleNewArticle(payload.new as NewsArticle);
            }
          }
        )
        .subscribe((status, err) => {
          console.log('Real-time subscription status:', status);
          
          if (err) {
            console.error('Real-time subscription error:', err);
          }
          
          setIsRealtimeConnected(status === 'SUBSCRIBED');
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time connection established');
            setConnectionAttempts(0);
            
            // Track presence (optional)
            subscription.track({
              user: `reader_${Date.now()}`,
              online_at: new Date().toISOString()
            });
            
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Real-time connection error:', status);
            setIsRealtimeConnected(false);
            
            // Retry logic with exponential backoff
            if (connectionAttempts < 3) {
              const delay = Math.pow(2, connectionAttempts) * 1000;
              console.log(`🔄 Retrying connection in ${delay}ms...`);
              
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              
              timeoutRef.current = setTimeout(() => {
                setConnectionAttempts(prev => prev + 1);
                setupRealtimeSubscription();
              }, delay);
            } else {
              toast.error(t.connectionIssue, {
                duration: 3000,
                icon: '⚠️'
              });
            }
          } else if (status === 'CLOSED') {
            console.log('🔌 Real-time connection closed');
            setIsRealtimeConnected(false);
          }
        });

      subscriptionRef.current = subscription;
      return subscription;
      
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      setIsRealtimeConnected(false);
      toast.error('Gagal menghubungkan ke sistem real-time');
    }
  }, [handleNewArticle, connectionAttempts, t.connectionIssue]);

  // ✅ Initialize and cleanup
  useEffect(() => {
    // Fetch initial data if not provided
    if (initialPosts.length === 0) {
      fetchLatestNews(true);
    } else {
      setLastFetchTime(new Date().toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US'));
    }

    // Setup real-time subscription
    const subscription = setupRealtimeSubscription();

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        supabaseClient.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetchLatestNews, setupRealtimeSubscription, initialPosts.length, language]);

  // ✅ Manual refresh function
  const handleManualRefresh = () => {
    fetchLatestNews(true);
  };

  // ✅ Test connection function
  const testConnection = () => {
    const status = getRealtimeStatus();
    console.log('Current realtime status:', status);
    
    if (!isRealtimeConnected) {
      setupRealtimeSubscription();
      toast.loading('Mencoba menghubungkan ulang...', { duration: 2000 });
    } else {
      toast.success('✅ Koneksi real-time aktif!');
    }
  };

  // ✅ Extract categories
  const allCategories: string[] = posts
    .flatMap(post => post.categories || [])
    .filter((category, index, self) => self.indexOf(category) === index)
    .sort();

  // ✅ Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === 'all' || 
      (post.categories && post.categories.includes(activeCategory));
    
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // ✅ Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      {/* ✅ Search and Controls */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            <span className="absolute right-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ New articles indicator */}
            {newPostsCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded-full flex items-center gap-1"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                {newPostsCount} {t.newArticles}
              </motion.div>
            )}

            {/* ✅ Manual refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className={`px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={t.refresh}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? t.loading : t.refresh}
            </button>

            {/* ✅ Category filters */}
            {allCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1 text-sm rounded-full ${
                    activeCategory === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {t.allCategories}
                </button>
                
                {allCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 py-1 text-sm rounded-full ${
                      activeCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ✅ Status Bar */}
        <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            {lastFetchTime && (
              <div>{t.lastUpdated}: {lastFetchTime}</div>
            )}
            <button
              onClick={testConnection}
              className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
              title="Click to test connection"
            >
              <div className={`w-2 h-2 rounded-full ${
                isRealtimeConnected 
                  ? 'bg-green-500 animate-pulse' 
                  : connectionAttempts > 0 
                    ? 'bg-yellow-500 animate-bounce' 
                    : 'bg-red-500'
              }`}></div>
              <span>
                {t.realTime}: {
                  isRealtimeConnected 
                    ? t.connected 
                    : connectionAttempts > 0 
                      ? t.connecting 
                      : t.disconnected
                }
              </span>
            </button>
          </div>
          
          {filteredPosts.length > 0 && (
            <div className="text-gray-400 dark:text-gray-500">
              {filteredPosts.length} artikel
            </div>
          )}
        </div>
      </div>

      {/* ✅ Loading state */}
      {loading && filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      )}

      {/* ✅ No results state */}
      {!loading && filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10m2 4h-10a2 2 0 01-2-2V6m15 4h-4m-2 4h-4m-2 4h-4M9 6h.01" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">{t.noResults.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t.noResults.text}
          </p>
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t.checkForUpdates}
          </button>
        </div>
      ) : (
        /* ✅ News Grid */
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post, index) => (
              <motion.div 
                key={post.id}
                variants={index === 0 && newPostsCount > 0 ? newPostVariants : itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
                className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ${
                  index === 0 && newPostsCount > 0 ? 'ring-2 ring-green-500 ring-opacity-50' : ''
                }`}
              >
                <Link href={`/news/${post.slug}`}>
                  <div className="relative h-48 overflow-hidden">
                    {post.featured_image ? (
                      <Image
                        src={post.featured_image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* ✅ New badge */}
                    {index === 0 && newPostsCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold"
                      >
                        BARU!
                      </motion.div>
                    )}
                    
                    {/* ✅ Categories */}
                    {post.categories && post.categories.length > 0 && (
                      <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                        {post.categories.slice(0, 2).map((category, idx) => (
                          <span 
                            key={idx} 
                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {formatDate(post.published_at)}
                      {post.author && (
                        <span className="ml-2">• {post.author}</span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {post.title}
                    </h3>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    
                    <div className="flex justify-end">
                      <span className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center text-sm">
                        {t.readMore}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default Berita;