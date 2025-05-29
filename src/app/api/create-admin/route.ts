// src/app/api/buat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';
import { UserRole, isValidRole } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    // Verifikasi admin user
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admin users can create new users.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
   
    // Validasi field
    const { id, username, email, password, role } = body;
   
    if (!id || !username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validasi role
    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin", "finance", or "content_editor"' },
        { status: 400 }
      );
    }
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Cek username dan email yang sudah ada (case-insensitive)
    // Cek username
    const { data: usernameExists, error: usernameError } = await supabaseAdmin
      .from('users')
      .select('username')
      .ilike('username', username)
      .maybeSingle();
      
    if (usernameError) {
      console.error('Database error when checking username:', usernameError);
      return NextResponse.json(
        { error: 'Database error when checking existing username' },
        { status: 500 }
      );
    }
    
    if (usernameExists) {
      return NextResponse.json(
        { error: 'Username already exists (case-insensitive)' },
        { status: 409 }
      );
    }
    
    // Cek email
    const { data: emailExists, error: emailError } = await supabaseAdmin
      .from('users')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle();
      
    if (emailError) {
      console.error('Database error when checking email:', emailError);
      return NextResponse.json(
        { error: 'Database error when checking existing email' },
        { status: 500 }
      );
    }
    
    if (emailExists) {
      return NextResponse.json(
        { error: 'Email already exists (case-insensitive)' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id,
        username,
        email: normalizedEmail, // Store email as lowercase
        password: hashedPassword,
        role: role as UserRole,
        created_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Error creating user:', insertError);
      return NextResponse.json(
        { error: 'Failed to create user in database' },
        { status: 500 }
      );
    }
    
    // Log event
    try {
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: token.id as string,
        action: 'create_user',
        resource_id: id,
        details: JSON.stringify({ username, email: normalizedEmail, role }),
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      // Log error but continue
      console.error('Failed to log admin action:', logError);
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `User dengan role "${role}" berhasil ditambahkan`
    });
  } catch (error) {
    console.error('Error in create-admin API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}