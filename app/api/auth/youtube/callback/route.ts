import { NextResponse } from 'next/server';
import { exchangeYouTubeCode } from '@/lib/social-auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=youtube_auth_failed`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=missing_params`
    );
  }

  try {
    const tokens = await exchangeYouTubeCode(code);
    
    // Store tokens securely (you might want to use a session or secure cookie)
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/channels`
    );
    
    response.cookies.set('youtube_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
    });

    if (tokens.refreshToken) {
      response.cookies.set('youtube_refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    console.error('YouTube auth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=youtube_auth_failed`
    );
  }
}