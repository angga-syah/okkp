// src/lib/news.ts
// This is a client-safe version that doesn't rely on supabaseAdmin for client operations

import { supabaseClient } from '@/lib/sb_client';

export interface NewsArticle {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content: any;
  featured_image?: string;
  author?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  status: 'draft' | 'published';
  categories?: string[];
}

/**
 * Get all published news articles - client-safe
 */
export const getPublishedArticles = async (limit: number = 10, offset: number = 0) => {
  const { data, error, count } = await supabaseClient
    .from('news_articles')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching published articles:', error);
    return { articles: [], count: 0 };
  }

  return { articles: data || [], count: count || 0 };
};

/**
 * Get a single article by slug - client-safe
 */
export const getArticleBySlug = async (slug: string) => {
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching article by slug:', error);
    return null;
  }

  return data;
};

/**
 * Get related articles - client-safe
 */
export const getRelatedArticles = async (currentSlug: string, categories: string[] = [], limit: number = 3) => {
  if (!categories || categories.length === 0) {
    const { data, error } = await supabaseClient
      .from('news_articles')
      .select('*')
      .neq('slug', currentSlug)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching related articles:', error);
      return [];
    }

    return data || [];
  }

  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('*')
    .neq('slug', currentSlug)
    .eq('status', 'published')
    .contains('categories', categories)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }

  return data || [];
};

/**
 * Upload image to news media bucket - client-safe
 */
export const uploadNewsImage = async (file: File, folderPath: string = 'images') => {
  // Create a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;

  try {
    const { error } = await supabaseClient.storage
      .from('news_media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabaseClient.storage
      .from('news_media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Get article categories for filtering - client-safe
 */
export const getNewsCategories = async () => {
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('categories')
    .eq('status', 'published');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  // Extract and flatten all categories from all articles
  const allCategories = data?.flatMap(article => article.categories || []) || [];
  
  // Remove duplicates and sort
  const uniqueCategories = Array.from(new Set(allCategories)).sort();
  
  return uniqueCategories;
};