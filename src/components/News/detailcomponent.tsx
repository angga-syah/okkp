// E:\kp\kp normal\kp normal\src\components\News\detailcomponent.tsx
"use client"

import React from 'react';
import { useLanguage } from '@/components/Header/Bahasa';
import Image from 'next/image';
import Link from 'next/link';
import TipoJSONToHTML from '@/components/News/TipoJSONToHTML';

interface RelatedPost {
  slug: string;
  title: string;
  featured_image?: string;
  categories?: string[];
  published_at: string;
}

interface NewsDetailProps {
  post: {
    title: string;
    excerpt?: string;
    content: any;
    featured_image?: string;
    author?: string;
    published_at: string;
    categories?: string[];
  };
  relatedPosts: RelatedPost[];
}

const NewsDetailClientComponent: React.FC<NewsDetailProps> = ({ post, relatedPosts }) => {
  const { language } = useLanguage();

  // Translations
  const translations = {
    en: {
      by: "By",
      relatedArticles: "Related Articles",
      backToNews: "Back to News",
      publishedOn: "Published on"
    },
    id: {
      by: "Oleh",
      relatedArticles: "Artikel Terkait",
      backToNews: "Kembali ke Berita",
      publishedOn: "Diterbitkan pada"
    }
  };

  // Current language text
  const t = translations[language as keyof typeof translations];

  // Format date based on language
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <div>
      <section className="pb-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            {post.categories && post.categories.length > 0 && (
              <div className="mb-3">
                {post.categories.map((category) => (
                  <span key={category} className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium mr-2 mb-2">
                    {category}
                  </span>
                ))}
              </div>
            )}
            <h1 className="mb-4 text-lg md:text-xl lg:text-2xl font-bold max-w-4xl leading-tight text-gray-900 dark:text-white">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <span>{formatDate(post.published_at)}</span>
              {post.author && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600"></span>
                  <span>{t.by}: {post.author}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image - Ukuran lebih proporsional */}
      {post.featured_image && (
        <div className="container mx-auto px-4 -mt-2 mb-6">
          <div className="relative w-full max-w-3xl mx-auto h-[300px] md:h-[400px] rounded-xl overflow-hidden">
            <Image 
              src={post.featured_image} 
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
        </div>
      )}

      {/* Content Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap -mx-4">
            <div className="w-full px-4 lg:w-9/12 mx-auto">
              <div className="prose prose-base max-w-none dark:prose-invert bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                {/* Render TipTap JSON content */}
                <TipoJSONToHTML content={post.content} />
              </div>              
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts Section - Diperkecil sedikit */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="py-12 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-white">
              {t.relatedArticles}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link href={`/news/${relatedPost.slug}`} key={relatedPost.slug}>
                  <div className="block bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {relatedPost.featured_image && (
                      <div className="relative w-full h-44 overflow-hidden">
                        <Image
                          src={relatedPost.featured_image}
                          alt={relatedPost.title}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      {relatedPost.categories && relatedPost.categories.length > 0 && (
                        <div className="mb-2">
                          <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                            {relatedPost.categories[0]}
                          </span>
                        </div>
                      )}
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                        {relatedPost.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">
                        {formatDate(relatedPost.published_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/news" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t.backToNews}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default NewsDetailClientComponent;