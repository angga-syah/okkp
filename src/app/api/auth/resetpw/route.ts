import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/sb_admin';

interface RequestBody {
  token: string;
  password: string;
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json() as RequestBody;
    
    if (!token || !password) {
      return NextResponse.json({ message: 'Token dan password harus diisi' }, { status: 400 });
    }
    
    if (password.length < 1) {
      return NextResponse.json({ message: 'Password tidak boleh kosong' }, { status: 400 });
    }
    
    // validasi token
    const now = new Date().toISOString();
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', now)
      .single();
    
    if (tokenError || !tokenData) {
      return NextResponse.json({ message: 'Token tidak valid atau sudah kedaluwarsa' }, { status: 400 });
    }
    
    // hash password baru
    const hashedPassword = await hash(password, 10);
    
    // update password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', tokenData.user_id);
    
    if (updateError) {
      return NextResponse.json({ message: 'Gagal memperbarui password' }, { status: 500 });
    }
    
    // hapus token setelah digunakan
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('token', token);
    
    return NextResponse.json({ message: 'Password berhasil direset' });
  } catch (error) {
    console.error('Error during password reset:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan, silakan coba lagi nanti' }, { status: 500 });
  }
}