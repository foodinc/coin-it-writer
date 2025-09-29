import { z } from 'zod';
import { getYouTubeChannelData } from './youtube-api';
import { getTwitterUserData } from './twitter-api';
import { getTikTokUserData } from './tiktok-api';
import { getFacebookOrInstagramData } from './facebook-instagram-api';
import { getTelegramChatData } from './telegram-api';

// Social metrics interface
export interface SocialMetrics {
  followers?: number;
  subscribers?: number;
  platformType: string;
  handle: string;
  name: string;
  description?: string;
  profileUrl: string;
  avatarUrl?: string;
  verified?: boolean;
  chatType?: 'channel' | 'group' | 'supergroup';
  statistics?: {
    views?: number;
    posts?: number;
    following?: number;
    likes?: number;
    reels?: number;
    pageCategory?: string;
    messageStats?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    admins?: number;
  };
}

// Rate limiting helper
const rateLimiter = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(key) || 0;
  if (requests >= MAX_REQUESTS) return false;
  rateLimiter.set(key, requests + 1);
  setTimeout(() => rateLimiter.delete(key), RATE_LIMIT_WINDOW);
  return true;
}

// YouTube API
async function fetchYouTubeMetrics(channelId: string): Promise<SocialMetrics> {
  if (!process.env.YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');
  if (!checkRateLimit('youtube')) throw new Error('Rate limit exceeded for YouTube API');

  try {
    const channelData = await getYouTubeChannelData(channelId);
    
    return {
      followers: channelData.statistics.subscriberCount,
      subscribers: channelData.statistics.subscriberCount,
      platformType: 'youtube',
      handle: channelData.customUrl || channelId,
      name: channelData.title,
      description: channelData.description,
      profileUrl: `https://youtube.com/channel/${channelData.id}`,
      avatarUrl: channelData.thumbnails.high || channelData.thumbnails.medium || channelData.thumbnails.default,
      verified: channelData.verified,
      statistics: {
        views: channelData.statistics.viewCount,
        posts: channelData.statistics.videoCount,
      },
    };
  } catch (error) {
    console.error('Error fetching YouTube metrics:', error);
    throw error;
  }
}

// Twitter/X API
async function fetchTwitterMetrics(username: string): Promise<SocialMetrics> {
  if (!process.env.TWITTER_BEARER_TOKEN) throw new Error('Twitter API token not configured');
  if (!checkRateLimit('twitter')) throw new Error('Rate limit exceeded for Twitter API');

  try {
    const userData = await getTwitterUserData(username);
    
    return {
      followers: userData.metrics.followersCount,
      subscribers: userData.metrics.followersCount,
      platformType: 'twitter',
      handle: userData.username,
      name: userData.name,
      description: userData.description,
      profileUrl: `https://twitter.com/${userData.username}`,
      avatarUrl: userData.profileImageUrl,
      verified: userData.verified,
      statistics: {
        posts: userData.metrics.tweetCount,
        following: userData.metrics.followingCount,
      },
    };
  } catch (error) {
    console.error('Error fetching Twitter metrics:', error);
    throw error;
  }
}

// TikTok API
async function fetchTikTokMetrics(username: string): Promise<SocialMetrics> {
  if (!checkRateLimit('tiktok')) throw new Error('Rate limit exceeded for TikTok API');

  try {
    const userData = await getTikTokUserData(username);
    
    return {
      followers: userData.metrics.followersCount,
      subscribers: userData.metrics.followersCount,
      platformType: 'tiktok',
      handle: userData.username,
      name: userData.displayName,
      description: userData.bio,
      profileUrl: `https://tiktok.com/@${userData.username}`,
      avatarUrl: userData.avatarUrl,
      verified: userData.verified,
      statistics: {
        posts: userData.metrics.videoCount,
        following: userData.metrics.followingCount,
        likes: userData.metrics.likesCount,
      },
    };
  } catch (error) {
    console.error('Error fetching TikTok metrics:', error);
    throw error;
  }
}

// Facebook/Instagram API
async function fetchFacebookOrInstagramMetrics(url: string): Promise<SocialMetrics> {
  if (!checkRateLimit('facebook')) throw new Error('Rate limit exceeded for Facebook/Instagram API');

  try {
    const data = await getFacebookOrInstagramData(url);
    
    const baseMetrics: SocialMetrics = {
      followers: data.followers,
      subscribers: data.followers,
      platformType: data.type,
      handle: data.username || '',
      name: data.name,
      description: data.bio,
      profileUrl: url,
      avatarUrl: data.profilePicture,
      verified: data.verified,
      statistics: {
        following: data.follows,
        posts: data.posts,
      },
    };

    // Add platform-specific stats
    if (data.type === 'page') {
      baseMetrics.statistics!.likes = data.likes;
      baseMetrics.statistics!.pageCategory = data.category;
    } else if (data.type === 'instagram') {
      baseMetrics.statistics!.reels = data.reels;
    }

    return baseMetrics;
  } catch (error) {
    console.error('Error fetching Facebook/Instagram metrics:', error);
    throw error;
  }
}

// Main export function that handles all platforms
// Telegram API
async function fetchTelegramMetrics(username: string): Promise<SocialMetrics> {
  if (!checkRateLimit('telegram')) throw new Error('Rate limit exceeded for Telegram API');

  try {
    const chatData = await getTelegramChatData(username);
    
    return {
      followers: chatData.memberCount,
      subscribers: chatData.memberCount,
      platformType: 'telegram',
      handle: chatData.username || username,
      name: chatData.title,
      description: chatData.description,
      profileUrl: `https://t.me/${username}`,
      avatarUrl: chatData.photoUrl,
      verified: chatData.isVerified,
      chatType: chatData.type,
      statistics: {
        messageStats: {
          daily: chatData.metrics.messageCount,
          weekly: chatData.metrics.messageCount,
          monthly: chatData.metrics.messageCount,
        },
        admins: chatData.metrics.adminCount,
      },
    };
  } catch (error) {
    console.error('Error fetching Telegram metrics:', error);
    throw error;
  }
}

export async function fetchSocialMetrics(url: string, platform: string, channelId: string): Promise<SocialMetrics> {
  try {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return await fetchYouTubeMetrics(channelId);
      case 'twitter':
      case 'x':
        return await fetchTwitterMetrics(channelId);
      case 'tiktok':
        return await fetchTikTokMetrics(channelId);
      case 'facebook':
      case 'instagram':
        return await fetchFacebookOrInstagramMetrics(url);
      case 'telegram':
        return await fetchTelegramMetrics(channelId);
      default:
        // Return basic info for unsupported platforms
        return {
          platformType: platform,
          handle: channelId,
          name: channelId,
          profileUrl: url,
        };
    }
  } catch (error) {
    console.error(`Error fetching metrics for ${platform}:`, error);
    // Return basic info on error
    return {
      platformType: platform,
      handle: channelId,
      name: channelId,
      profileUrl: url,
    };
  }
}