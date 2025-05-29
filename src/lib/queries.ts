// lib/sanity/queries.ts

import { supabaseClient } from '@/lib/sb_client';

// Interface for news articles
export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: any;
  featured_image?: string;
  author?: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  status: string;
  categories?: string[];
}

/**
 * Get all published news posts
 */
export async function getAllPosts(): Promise<NewsPost[]> {
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching news posts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single post by slug
 */
export async function getPostBySlug(slug: string): Promise<NewsPost | null> {
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error('Error fetching post by slug:', error);
    return null;
  }

  return data;
}

/**
 * Get related posts based on categories
 */
export async function getRelatedPosts(currentSlug: string, categories: string[] = [], limit: number = 3): Promise<NewsPost[]> {
  if (!categories || categories.length === 0) {
    // If no categories, just get recent posts
    const { data, error } = await supabaseClient
      .from('news_articles')
      .select('*')
      .neq('slug', currentSlug)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching related posts:', error);
      return [];
    }

    return data || [];
  }

  // For posts with categories, find related by category
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('*')
    .neq('slug', currentSlug)
    .eq('status', 'published')
    .contains('categories', categories)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(category: string, limit: number = 10): Promise<NewsPost[]> {
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('*')
    .eq('status', 'published')
    .contains('categories', [category])
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching posts by category:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all unique categories
 */
export async function getAllCategories(): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('news_articles')
    .select('categories')
    .eq('status', 'published');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  // Extract and flatten all categories
  const allCategories = data?.flatMap(post => post.categories || []) || [];
  
  // Remove duplicates
  const uniqueCategories = Array.from(new Set(allCategories)).sort();
  
  return uniqueCategories;
}