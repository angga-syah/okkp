import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    
    return NextResponse.json({ 
      timestamp,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      success: true 
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get server time', success: false },
      { status: 500 }
    );
  }
}