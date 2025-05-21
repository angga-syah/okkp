import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createTransport, Transporter } from 'nodemailer';
import { supabaseAdmin } from '@/lib/sb_admin';

interface RequestBody {
  email: string;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json() as RequestBody;
    
    // validasi email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ message: 'Email tidak valid' }, { status: 400 });
    }
    
    // Periksa email terdaftar di Supabase
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      // tidak memberi tahu user email tidak terdaftar
      return NextResponse.json({ message: 'Jika email terdaftar, link reset password akan dikirim.' });
    }
    
    // generate token
    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token 1 jam
    
    // simpan token di Supabase
    await supabaseAdmin
      .from('password_reset_tokens')
      .upsert({
        user_id: user.id,
        token: token,
        expires_at: expires.toISOString(),
      });
    
    //reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/resetpw?token=${token}`;
    
    //kirim email dengan nodemailer
    const transporter: Transporter = createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: 'Reset Password',
      html: `
        <p>Anda telah meminta untuk reset password.</p>
        <p>Klik link di bawah ini untuk reset password Anda:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
        <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      `,
    });
    
    return NextResponse.json({ message: 'Jika email terdaftar, link reset password akan dikirim.' });
  } catch (error) {
    console.error('Error during password reset request:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan, silakan coba lagi nanti.' }, { status: 500 });
  }
}