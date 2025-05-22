// app/api/cron/cleanup-rate-limits/route.ts
import { NextResponse } from 'next/server';
import { SupabaseRateLimiter } from '@/lib/sb_limiter'; 

export async function GET() {
  // membersihkan data rate limit yang lebih dari 24 jam
  const result = await SupabaseRateLimiter.cleanup(24);
  
  return NextResponse.json({ success: result.success });
}