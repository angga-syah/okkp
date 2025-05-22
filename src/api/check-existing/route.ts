// src/app/api/check-existing/route.ts
//add user check existing
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated (doesn't need to be admin to check)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Check for a username or email
    if (body.type === 'username') {
      const { value } = body;
      
      if (!value) {
        return NextResponse.json(
          { error: 'Missing username value' },
          { status: 400 }
        );
      }
      
      // Check if username exists (case-insensitive)
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('username')
        .ilike('username', value)
        .maybeSingle();
        
      if (error) {
        console.error('Database error when checking username:', error);
        return NextResponse.json(
          { error: 'Database error when checking existing username' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        exists: !!data,
        existsType: data ? 'username' : null
      });
    } 
    else if (body.type === 'email') {
      const { value } = body;
      
      if (!value) {
        return NextResponse.json(
          { error: 'Missing email value' },
          { status: 400 }
        );
      }
      
      // Normalize email to lowercase
      const normalizedEmail = value.toLowerCase();
      
      // Check if email exists (case-insensitive)
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('email')
        .ilike('email', normalizedEmail)
        .maybeSingle();
        
      if (error) {
        console.error('Database error when checking email:', error);
        return NextResponse.json(
          { error: 'Database error when checking existing email' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        exists: !!data,
        existsType: data ? 'email' : null
      });
    }
    else if (body.type === 'both') {
      const { username, email } = body;
      
      if (!username || !email) {
        return NextResponse.json(
          { error: 'Missing username or email value' },
          { status: 400 }
        );
      }
      
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();
      
      // Check if username exists (case-insensitive)
      const { data: usernameData, error: usernameError } = await supabaseAdmin
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
      
      if (usernameData) {
        return NextResponse.json({
          exists: true,
          existsType: 'username'
        });
      }
      
      // Check if email exists (case-insensitive)
      const { data: emailData, error: emailError } = await supabaseAdmin
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
      
      return NextResponse.json({
        exists: !!emailData,
        existsType: emailData ? 'email' : null
      });
    }
    else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "username", "email", or "both"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in check-existing API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}