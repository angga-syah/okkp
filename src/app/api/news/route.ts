// src/app/api/news/route.ts - Enhanced Admin API with Real-time Support
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';

// ✅ GET handler for admin - retrieve all news articles
export async function GET(request: Request) {
  try {
    // ✅ Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
   
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
   
    // ✅ Initialize supabase admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
   
    // ✅ Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const includeUnpublished = url.searchParams.get('admin') === 'true';
   
    // ✅ Build the query with proper ordering - FIXED: removed nullsLast
    let query = supabaseAdmin
      .from('news_articles')
      .select('*');
   
    // ✅ Filter by status if provided
    if (status) {
      query = query.eq('status', status);
     
      // ✅ Order by published_at for published articles, created_at for others
      if (status === 'published') {
        query = query
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
    } else {
      // ✅ Default ordering - FIXED: Use separate queries for better ordering
      query = query.order('created_at', { ascending: false });
    }
   
    // ✅ Apply limit
    query = query.limit(limit);
   
    const { data, error } = await query;
   
    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // ✅ Sort the results manually to prioritize published articles with published_at
    const sortedData = data?.sort((a, b) => {
      // Published articles with published_at first
      if (a.published_at && !b.published_at) return -1;
      if (!a.published_at && b.published_at) return 1;
      
      // Both have published_at, sort by published_at desc
      if (a.published_at && b.published_at) {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      }
      
      // Neither have published_at, sort by created_at desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }) || [];
   
    return NextResponse.json({
      articles: sortedData,
      timestamp: new Date().toISOString()
    });
   
  } catch (error) {
    console.error('Error fetching news articles:', error);
    return NextResponse.json({
      error: 'Failed to fetch articles',
      articles: []
    }, { status: 500 });
  }
}

// ✅ POST handler - create new article with real-time trigger
export async function POST(request: Request) {
  try {
    // ✅ Check authentication
    const session = await getServerSession();
   
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
   
    // ✅ Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
   
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
   
    // ✅ Initialize supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
   
    const article = await request.json();
   
    // ✅ Enhanced validation
    if (!article.title || article.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
   
    if (!article.content || typeof article.content !== 'object') {
      return NextResponse.json({ error: 'Valid content is required' }, { status: 400 });
    }
   
    // ✅ Generate unique slug if not provided
    if (!article.slug) {
      const timestamp = Date.now();
      const baseSlug = article.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50); // Limit length
      article.slug = `${baseSlug}-${timestamp}`;
    }
   
    // ✅ Set published_at for published articles
    if (article.status === 'published' && !article.published_at) {
      article.published_at = new Date().toISOString();
    }
   
    // ✅ Set author if not provided
    if (!article.author && session.user.name) {
      article.author = session.user.name;
    } else if (!article.author && session.user.email) {
      article.author = session.user.email;
    }
   
    // ✅ Ensure categories is an array
    if (!article.categories) {
      article.categories = [];
    }
   
    // ✅ Create the article
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .insert([article])
      .select()
      .single();
   
    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }
   
    // ✅ Log for debugging real-time
    if (data.status === 'published') {
      console.log('🔥 New article published via API:', {
        id: data.id,
        title: data.title,
        published_at: data.published_at
      });
    }
   
    return NextResponse.json({
      article: data,
      message: data.status === 'published' ? 'Article published successfully' : 'Article saved as draft'
    });
   
  } catch (error) {
    console.error('Error creating news article:', error);
   
    // ✅ Better error messages
    let errorMessage = 'Failed to create article';
    if (error instanceof Error) {
      if (error.message.includes('duplicate')) {
        errorMessage = 'Article with this slug already exists';
      } else if (error.message.includes('foreign key')) {
        errorMessage = 'Invalid data reference';
      } else {
        errorMessage = error.message;
      }
    }
   
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}