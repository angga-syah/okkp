// src/app/api/news/route.ts - Updated without RLS checks
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';

// GET handler to retrieve all news articles
export async function GET(request: Request) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Initialize supabase admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the URL search params
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Build the query
    let query = supabaseAdmin
      .from('news_articles')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply limit
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ articles: data });
  } catch (error) {
    console.error('Error fetching news articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

// POST handler to create a new news article
export async function POST(request: Request) {
  try {
    // Basic check for authentication (keeps admin-only functionality)
    const session = await getServerSession();
    
    // Check if session exists
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Initialize supabase admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const article = await request.json();
    
    // Basic validation
    if (!article.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    // Handle slug creation if not provided
    if (!article.slug) {
      const timestamp = new Date().getTime();
      const title = article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
      article.slug = `${title}-${timestamp}`;
    }
    
    // Set published_at date if status is published
    if (article.status === 'published' && !article.published_at) {
      article.published_at = new Date().toISOString();
    }
    
    // Set author if not provided
    if (!article.author && session.user.name) {
      article.author = session.user.name;
    }
    
    // Create the article using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .insert([article])
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ article: data });
  } catch (error) {
    console.error('Error creating news article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}