export interface TikTokUserData {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  verified: boolean;
  metrics: {
    followersCount: number;
    followingCount: number;
    likesCount: number;
    videoCount: number;
  };
}

export async function getTikTokUserData(username: string): Promise<TikTokUserData> {
  if (!process.env.TIKTOK_ACCESS_TOKEN) {
    throw new Error('TikTok API token not configured');
  }

  try {
    // TikTok API V2 endpoint
    const response = await fetch(
      'https://open.tiktokapis.com/v2/user/info/',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: [
            'user_id',
            'username',
            'display_name',
            'bio_description',
            'avatar_url',
            'is_verified',
            'follower_count',
            'following_count',
            'likes_count',
            'video_count'
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.user) {
      throw new Error('TikTok user not found');
    }

    const user = data.data.user;
    return {
      id: user.user_id,
      username: user.username,
      displayName: user.display_name,
      bio: user.bio_description,
      avatarUrl: user.avatar_url,
      verified: user.is_verified,
      metrics: {
        followersCount: user.follower_count,
        followingCount: user.following_count,
        likesCount: user.likes_count,
        videoCount: user.video_count
      }
    };
  } catch (error) {
    console.error('Error fetching TikTok user data:', error);
    throw error;
  }
}