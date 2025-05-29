import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { timezone } = await req.json();

    if (!timezone) {
      return NextResponse.json(
        { error: 'Timezone is required', success: false },
        { status: 400 }
      );
    }

    // Try to get accurate time from WorldTimeAPI
    try {
      const worldTimeResponse = await fetch(
        `http://worldtimeapi.org/api/timezone/${timezone}`,
        {
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (worldTimeResponse.ok) {
        const worldTimeData = await worldTimeResponse.json();
        
        return NextResponse.json({
          datetime: worldTimeData.datetime,
          timezone: worldTimeData.timezone,
          utc_offset: worldTimeData.utc_offset,
          source: 'WorldTimeAPI',
          success: true
        }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    } catch (worldTimeError) {
      console.warn('WorldTimeAPI failed, trying fallback...');
    }

    // Fallback: Try time.is API
    try {
      const timeIsResponse = await fetch('https://time.is/just', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (timeIsResponse.ok) {
        const timeIsText = await timeIsResponse.text();
        // time.is returns timestamp in seconds
        const timestamp = parseInt(timeIsText) * 1000;
        const datetime = new Date(timestamp).toISOString();

        return NextResponse.json({
          datetime,
          timezone,
          source: 'Time.is',
          success: true
        }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    } catch (timeIsError) {
      console.warn('Time.is API failed, using server time...');
    }

    // Final fallback: Use server time with timezone conversion
    const serverTime = new Date();
    
    // Create a time in the user's timezone
    const userTime = new Date(serverTime.toLocaleString("en-US", { timeZone: timezone }));
    
    return NextResponse.json({
      datetime: userTime.toISOString(),
      timezone,
      source: 'Server (timezone converted)',
      success: true,
      warning: 'Using server time as fallback - accuracy may be reduced'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error getting accurate time:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get accurate time', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: GET method for simple time requests
export async function GET() {
  try {
    // Default to UTC for GET requests
    const worldTimeResponse = await fetch('http://worldtimeapi.org/api/timezone/UTC', {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (worldTimeResponse.ok) {
      const worldTimeData = await worldTimeResponse.json();
      
      return NextResponse.json({
        datetime: worldTimeData.datetime,
        timezone: 'UTC',
        utc_offset: '+00:00',
        source: 'WorldTimeAPI',
        success: true
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Fallback to server time
    return NextResponse.json({
      datetime: new Date().toISOString(),
      timezone: 'UTC',
      source: 'Server',
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
      { 
        error: 'Failed to get time', 
        success: false 
      },
      { status: 500 }
    );
  }
}