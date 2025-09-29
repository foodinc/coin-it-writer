import { z } from 'zod';

// Types for authentication responses
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string[];
}

// YouTube OAuth configuration
const YOUTUBE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

// Twitch OAuth configuration
const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_SCOPES = [
  'channel:read:stream_key',
  'user:read:email',
].join(' ');

// Generate OAuth URLs
export function getYouTubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID || '',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',
    state,
  });
  
  return `${YOUTUBE_AUTH_URL}?${params.toString()}`;
}

export function getTwitchAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitch/callback`,
    response_type: 'code',
    scope: TWITCH_SCOPES,
    state,
  });
  
  return `${TWITCH_AUTH_URL}?${params.toString()}`;
}

// Exchange auth code for tokens
export async function exchangeYouTubeCode(code: string): Promise<AuthResponse> {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID || '',
    client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
  });

  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange YouTube auth code');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope.split(' '),
  };
}

export async function exchangeTwitchCode(code: string): Promise<AuthResponse> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
    client_secret: process.env.TWITCH_CLIENT_SECRET || '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitch/callback`,
  });

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Twitch auth code');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

// Verify channel ownership
export async function verifyYouTubeChannelOwnership(accessToken: string, channelId: string): Promise<boolean> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to verify YouTube channel ownership');
  }

  const data = await response.json();
  return data.items.some((channel: any) => channel.id === channelId);
}

export async function verifyTwitchChannelOwnership(accessToken: string, channelId: string): Promise<boolean> {
  const response = await fetch(
    'https://api.twitch.tv/helix/users',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to verify Twitch channel ownership');
  }

  const data = await response.json();
  return data.data[0]?.id === channelId;
}