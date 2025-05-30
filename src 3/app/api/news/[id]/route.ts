//E:\kp\kp normal\kp normal\src\app\api\news\[id]\route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/sb_admin';

// GET handler to retrieve a specific news article by ID
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise to get the ID
    const { id } = await params;
    
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    return NextResponse.json({ article: data });
  } catch (error) {
    console.error('Error fetching news article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

// PUT handler to update a news article
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the id parameter
    const { id } = await params;
    
    // Basic authentication check (only for admin operations)
    const session = await getServerSession();
    
    // Check if session exists
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const updates = await request.json();
    
    // If changing from draft to published, set published_at date
    if (updates.status === 'published') {
      // Get the current article to check its status
      const { data: existingArticle } = await supabaseAdmin
        .from('news_articles')
        .select('status')
        .eq('id', id)
        .single();
      
      if (existingArticle?.status === 'draft') {
        updates.published_at = new Date().toISOString();
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ article: data });
  } catch (error) {
    console.error('Error updating news article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

// DELETE handler to delete a news article
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the id parameter
    const { id } = await params;
    
    // Basic authentication check (only for admin operations)
    const session = await getServerSession();
    
    // Check if session exists
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete the article
    const { error } = await supabaseAdmin
      .from('news_articles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting news article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}