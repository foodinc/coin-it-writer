import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSocialMetrics } from '@/lib/social-metrics';

// Input validation schema
const importChannelSchema = z.object({
  url: z.string().url()
});

// Basic URL validation and platform detection
function validateAndDetectPlatform(url: string): { isValid: boolean; platformType?: string; channelId?: string; reason?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const paths = urlObj.pathname.split('/').filter(p => p);
    
    // Platform detection and validation
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
      let channelId = '';
      if (paths[0] === 'c') channelId = paths[1];
      else if (paths[0] === 'channel') channelId = paths[1];
      else if (paths[0]?.startsWith('@')) channelId = paths[0].substring(1);
      
      if (!channelId) {
        return { isValid: false, reason: 'Could not extract YouTube channel identifier' };
      }
      
      return { isValid: true, platformType: 'youtube', channelId };
    }
    
    if (hostname.includes('twitch.tv')) {
      const channelId = paths[0];
      if (!channelId) {
        return { isValid: false, reason: 'Could not extract Twitch username' };
      }
      
      return { isValid: true, platformType: 'twitch', channelId };
    }
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const channelId = paths[0];
      if (!channelId) {
        return { isValid: false, reason: 'Could not extract Twitter/X username' };
      }
      
      return { isValid: true, platformType: 'twitter', channelId };
    }
    
    if (hostname.includes('instagram.com')) {
      const channelId = paths[0];
      if (!channelId) {
        return { isValid: false, reason: 'Could not extract Instagram username' };
      }
      
      return { isValid: true, platformType: 'instagram', channelId };
    }
    
    if (hostname.includes('tiktok.com')) {
      const channelId = paths[0] === '@' ? paths[1] : paths[0];
      if (!channelId) {
        return { isValid: false, reason: 'Could not extract TikTok username' };
      }
      
      return { isValid: true, platformType: 'tiktok', channelId };
    }
    
    if (hostname.includes('t.me') || hostname.includes('telegram.me')) {
      const channelId = paths[0];
      if (!channelId) {
        return { isValid: false, reason: 'Could not extract Telegram channel identifier' };
      }
      
      return { isValid: true, platformType: 'telegram', channelId };
    }

    // Basic validation for other URLs
    if (paths.length > 0) {
      const channelId = paths[paths.length - 1];
      if (channelId.replace(/[^a-zA-Z0-9]/g, '').length === 0) {
        return { isValid: false, reason: 'Could not extract a valid channel identifier' };
      }
      
      return { isValid: true, platformType: hostname.split('.')[0], channelId };
    }

    return { isValid: false, reason: 'Could not detect platform or channel identifier' };
  } catch {
    return { isValid: false, reason: 'Invalid URL format' };
  }
}

// Input validation schema
const importChannelSchema = z.object({
  platform: z.enum(['youtube', 'twitch']),
  url: z.string().url()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const { url } = importChannelSchema.parse(body);

    // Validate URL and detect platform
    const validation = validateAndDetectPlatform(url);
    if (!validation.isValid) {
      return new NextResponse(JSON.stringify({ 
        error: validation.reason || 'Invalid URL' 
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Fetch social metrics for the channel
    const metrics = await fetchSocialMetrics(
      url,
      validation.platformType || 'other',
      validation.channelId || 'unknown'
    );

    return new NextResponse(JSON.stringify({
      name: metrics.name || validation.channelId || 'Unknown Channel',
      description: metrics.description || `${validation.platformType} channel`,
      platformType: metrics.platformType,
      url: metrics.profileUrl || url,
      followers: metrics.followers,
      subscribers: metrics.subscribers,
      avatarUrl: metrics.avatarUrl,
      verified: metrics.verified,
      handle: metrics.handle,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Error importing channel:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to process URL',
      details: error instanceof Error ? error.message : undefined,
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

function extractChannelIdentifier(url: string, platform: 'youtube' | 'twitch'): string | null {
  try {
    const urlObj = new URL(url);
    
    if (platform === 'youtube') {
      // Handle different YouTube URL formats
      const pathname = urlObj.pathname;
      if (pathname.startsWith('/c/')) return pathname.split('/c/')[1];
      if (pathname.startsWith('/channel/')) return pathname.split('/channel/')[1];
      if (pathname.startsWith('/@')) return pathname.substring(2);
      return null;
    } 
    
    if (platform === 'twitch') {
      // Twitch URLs are simpler - just get the username
      return urlObj.pathname.split('/')[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

// Platform-specific fetching will be implemented later