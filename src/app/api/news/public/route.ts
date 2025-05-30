// src/app/api/news/[id]/route.ts - Enhanced Article API with Real-time Support
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createClient } from '@supabase/supabase-js';

// ✅ GET handler - retrieve specific article by ID
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await the params Promise to get the ID
    const { id } = await params;
    
    // ✅ Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    return NextResponse.json({ article: data });
    
  } catch (error) {
    console.error('Error fetching news article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

// ✅ PUT handler - update article with real-time support
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Get the id parameter
    const { id } = await params;
    
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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const updates = await request.json();
    
    // ✅ Enhanced validation
    if (updates.title && updates.title.trim() === '') {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }
    
    if (updates.content && typeof updates.content !== 'object') {
      return NextResponse.json({ error: 'Invalid content format' }, { status: 400 });
    }
    
    // ✅ Get current article to check status change
    const { data: existingArticle, error: fetchError } = await supabaseAdmin
      .from('news_articles')
      .select('status, published_at, title')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching existing article:', fetchError);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    // ✅ Handle status change from draft to published
    if (updates.status === 'published') {
      if (existingArticle.status === 'draft') {
        // ✅ First time publishing - set published_at
        updates.published_at = new Date().toISOString();
        console.log('🔥 Article being published for first time:', existingArticle.title);
      } else if (!updates.published_at && !existingArticle.published_at) {
        // ✅ Ensure published_at is set
        updates.published_at = new Date().toISOString();
      }
    } else if (updates.status === 'draft' && existingArticle.status === 'published') {
      // ✅ Unpublishing - clear published_at
      updates.published_at = null;
      console.log('📝 Article being unpublished:', existingArticle.title);
    }
    
    // ✅ Ensure categories is properly formatted
    if (updates.categories && !Array.isArray(updates.categories)) {
      updates.categories = [];
    }
    
    // ✅ Update the article
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Database update error:', error);
      throw error;
    }
    
    // ✅ Log for real-time debugging
    if (data.status === 'published' && existingArticle.status !== 'published') {
      console.log('🔥 Article published via update:', {
        id: data.id,
        title: data.title,
        published_at: data.published_at,
        wasStatus: existingArticle.status
      });
    }
    
    return NextResponse.json({ 
      article: data,
      message: data.status === 'published' ? 'Article published successfully' : 'Article updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating news article:', error);
    
    // ✅ Better error handling
    let errorMessage = 'Failed to update article';
    if (error instanceof Error) {
      if (error.message.includes('duplicate')) {
        errorMessage = 'Article with this slug already exists';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ✅ DELETE handler - delete article with validation
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Get the id parameter
    const { id } = await params;
    
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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // ✅ Get article info before deletion for logging
    const { data: articleToDelete } = await supabaseAdmin
      .from('news_articles')
      .select('title, status')
      .eq('id', id)
      .single();
    
    // ✅ Delete the article
    const { error } = await supabaseAdmin
      .from('news_articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Database delete error:', error);
      throw error;
    }
    
    // ✅ Log deletion
    console.log('🗑️ Article deleted:', {
      id,
      title: articleToDelete?.title,
      status: articleToDelete?.status
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Article deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting news article:', error);
    return NextResponse.json({ 
      error: 'Failed to delete article',
      success: false 
    }, { status: 500 });
  }
}