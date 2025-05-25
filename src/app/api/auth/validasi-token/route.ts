import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ message: 'Token tidak ditemukan' }, { status: 400 });
    }
    
    // periksa token di database
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', now)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ message: 'Token tidak valid atau sudah kedaluwarsa' }, { status: 400 });
    }
    
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan saat memvalidasi token' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';