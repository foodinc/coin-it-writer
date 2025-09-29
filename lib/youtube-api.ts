import { google } from 'googleapis';

// Initialize the YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export interface YouTubeChannelData {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnails: {
    default?: string;
    medium?: string;
    high?: string;
  };
  statistics: {
    viewCount: number;
    subscriberCount: number;
    videoCount: number;
  };
  verified: boolean;
}

export async function getYouTubeChannelData(channelIdentifier: string): Promise<YouTubeChannelData> {
  try {
    // First, try to get channel by custom URL or handle
    let channelId = channelIdentifier;
    
    if (channelIdentifier.startsWith('@')) {
      const handleResponse = await youtube.search.list({
        part: ['id'],
        q: channelIdentifier,
        type: ['channel'],
        maxResults: 1,
      });
      
      channelId = handleResponse.data.items?.[0]?.id?.channelId || channelIdentifier;
    }

    // Get channel details
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'status'],
      id: [channelId],
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error('Channel not found');
    }

    return {
      id: channel.id!,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      customUrl: channel.snippet?.customUrl || '',
      thumbnails: {
        default: channel.snippet?.thumbnails?.default?.url,
        medium: channel.snippet?.thumbnails?.medium?.url,
        high: channel.snippet?.thumbnails?.high?.url,
      },
      statistics: {
        viewCount: parseInt(channel.statistics?.viewCount || '0'),
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
      },
      verified: channel.status?.isLinked || false,
    };
  } catch (error) {
    console.error('Error fetching YouTube channel data:', error);
    throw error;
  }
}