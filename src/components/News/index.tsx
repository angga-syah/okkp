// E:\kp\kp normal\kp normal\src\components\News\index.tsx
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from "../Header/Bahasa";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  published_at: string;
  categories?: string[];
}

interface NewsProps {
  posts: Post[];
}

// Animation variants
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

const Berita: React.FC<NewsProps> = ({ posts }) => {
  const { language } = useLanguage(); // Get current language
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Translation object
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
      readMore: "Read More"
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
      readMore: "Baca Selengkapnya"
    }
  };

  // Current language translations
  const t = translations[language as keyof typeof translations];

  // Extract all unique categories from posts
  const allCategories: string[] = posts
    .flatMap(post => post.categories || [])
    .filter((category, index, self) => self.indexOf(category) === index)
    .sort();

  // Filter posts by category and search query
  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === 'all' || 
      (post.categories && post.categories.includes(activeCategory));
    
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Format date based on language
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
      {/* Search and filter bar */}
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

      {/* News grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10m2 4h-10a2 2 0 01-2-2V6m15 4h-4m-2 4h-4m-2 4h-4M9 6h.01" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">{t.noResults.title}</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t.noResults.text}
          </p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredPosts.map((post) => (
            <motion.div 
              key={post.id}
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
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
                  
                  {post.categories && post.categories.length > 0 && (
                    <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                      {post.categories.map((category, idx) => (
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
        </motion.div>
      )}
    </div>
  );
};

export default Berita;