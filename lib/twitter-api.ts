export interface TwitterUserData {
  id: string;
  username: string;
  name: string;
  description: string;
  profileImageUrl: string;
  verified: boolean;
  metrics: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
  };
}

export async function getTwitterUserData(username: string): Promise<TwitterUserData> {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics,description,profile_image_url,verified`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      throw new Error('Twitter user not found');
    }

    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
      description: data.data.description,
      profileImageUrl: data.data.profile_image_url,
      verified: data.data.verified,
      metrics: {
        followersCount: data.data.public_metrics.followers_count,
        followingCount: data.data.public_metrics.following_count,
        tweetCount: data.data.public_metrics.tweet_count,
      },
    };
  } catch (error) {
    console.error('Error fetching Twitter user data:', error);
    throw error;
  }
}