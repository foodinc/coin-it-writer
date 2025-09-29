// Types for channel data
export interface ChannelData {
  name: string;
  description: string;
  subscribers: number;
  totalViews: number;
  avatarUrl: string;
  platformSpecificData?: {
    id?: string;
    url?: string;
    [key: string]: any;
  };
}

// YouTube specific types
interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
    statistics: {
      subscriberCount: string;
      viewCount: string;
    };
  }>;
}

// Twitch specific types
interface TwitchUserResponse {
  data: Array<{
    id: string;
    display_name: string;
    description: string;
    profile_image_url: string;
  }>;
}

interface TwitchFollowsResponse {
  total: number;
  data: Array<{
    from_id: string;
    to_id: string;
    followed_at: string;
  }>;
}

// YouTube API functions
export async function fetchYouTubeChannelData(channelId: string): Promise<ChannelData> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YouTube API key not configured');

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch YouTube channel data');
  }

  const data: YouTubeChannelResponse = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('YouTube channel not found');
  }

  const channel = data.items[0];
  return {
    name: channel.snippet.title,
    description: channel.snippet.description,
    subscribers: parseInt(channel.statistics.subscriberCount) || 0,
    totalViews: parseInt(channel.statistics.viewCount) || 0,
    avatarUrl: channel.snippet.thumbnails.high.url,
    platformSpecificData: {
      id: channel.id,
      url: `https://youtube.com/channel/${channel.id}`,
    }
  };
}

// Twitch API functions
export async function fetchTwitchChannelData(username: string): Promise<ChannelData> {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Twitch API credentials not configured');
  }

  // Get OAuth token
  const tokenResponse = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  );

  if (!tokenResponse.ok) {
    throw new Error('Failed to authenticate with Twitch');
  }

  const { access_token } = await tokenResponse.json();

  // Get user data
  const userResponse = await fetch(
    `https://api.twitch.tv/helix/users?login=${username}`,
    {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${access_token}`
      }
    }
  );

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Twitch user data');
  }

  const userData: TwitchUserResponse = await userResponse.json();
  
  if (!userData.data || userData.data.length === 0) {
    throw new Error('Twitch channel not found');
  }

  const user = userData.data[0];

  // Get follower count
  const followsResponse = await fetch(
    `https://api.twitch.tv/helix/users/follows?to_id=${user.id}`,
    {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${access_token}`
      }
    }
  );

  if (!followsResponse.ok) {
    throw new Error('Failed to fetch Twitch follower data');
  }

  const followsData: TwitchFollowsResponse = await followsResponse.json();

  return {
    name: user.display_name,
    description: user.description,
    subscribers: followsData.total,
    totalViews: 0, // Twitch doesn't provide total views in API
    avatarUrl: user.profile_image_url,
    platformSpecificData: {
      id: user.id,
      url: `https://twitch.tv/${user.display_name.toLowerCase()}`,
    }
  };
}

// Utility function to validate channel URLs
export function validateChannelUrl(url: string, platform: 'youtube' | 'twitch'): boolean {
  try {
    const urlObj = new URL(url);
    
    if (platform === 'youtube') {
      return (
        urlObj.hostname === 'youtube.com' ||
        urlObj.hostname === 'www.youtube.com' ||
        urlObj.hostname === 'youtube.com'
      ) && (
        urlObj.pathname.startsWith('/c/') ||
        urlObj.pathname.startsWith('/channel/') ||
        urlObj.pathname.startsWith('/@')
      );
    }
    
    if (platform === 'twitch') {
      return (
        urlObj.hostname === 'twitch.tv' ||
        urlObj.hostname === 'www.twitch.tv'
      ) && urlObj.pathname.length > 1; // Must have a username
    }

    return false;
  } catch {
    return false;
  }
}