interface FacebookBasicProfile {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
  verified: boolean;
  followers: number;
  follows?: number;
}

export interface FacebookPageData extends FacebookBasicProfile {
  type: 'page';
  category?: string;
  likes: number;
  posts: number;
}

export interface InstagramProfileData extends FacebookBasicProfile {
  type: 'instagram';
  posts: number;
  reels?: number;
}

type SocialProfileData = FacebookPageData | InstagramProfileData;

async function makeGraphRequest(path: string, fields: string[]): Promise<any> {
  if (!process.env.FACEBOOK_ACCESS_TOKEN) {
    throw new Error('Facebook API token not configured');
  }

  const url = new URL(`https://graph.facebook.com/v18.0/${path}`);
  url.searchParams.append('access_token', process.env.FACEBOOK_ACCESS_TOKEN);
  url.searchParams.append('fields', fields.join(','));

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function getFacebookPageData(pageId: string): Promise<FacebookPageData> {
  try {
    const data = await makeGraphRequest(pageId, [
      'name',
      'username',
      'about',
      'picture',
      'verification_status',
      'followers_count',
      'fan_count',
      'category',
      'posts.limit(0).summary(true)'
    ]);

    return {
      type: 'page',
      id: data.id,
      name: data.name,
      username: data.username,
      bio: data.about,
      profilePicture: data.picture?.data?.url,
      verified: data.verification_status === 'verified',
      followers: data.followers_count,
      likes: data.fan_count,
      category: data.category,
      posts: data.posts?.summary?.total_count || 0
    };
  } catch (error) {
    console.error('Error fetching Facebook page data:', error);
    throw error;
  }
}

export async function getInstagramProfileData(username: string): Promise<InstagramProfileData> {
  try {
    // First get the Instagram Business Account ID
    const searchResult = await makeGraphRequest('ig_hashtag_search', [
      'business_discovery.username(' + username + '){username,name,biography,profile_picture_url,follows_count,followers_count,media_count,ig_id,is_verified}'
    ]);

    const profile = searchResult.business_discovery;
    
    if (!profile) {
      throw new Error('Instagram profile not found');
    }

    return {
      type: 'instagram',
      id: profile.ig_id,
      name: profile.name,
      username: profile.username,
      bio: profile.biography,
      profilePicture: profile.profile_picture_url,
      verified: profile.is_verified,
      followers: profile.followers_count,
      follows: profile.follows_count,
      posts: profile.media_count
    };
  } catch (error) {
    console.error('Error fetching Instagram profile data:', error);
    throw error;
  }
}

// Helper function to determine the type of profile and fetch accordingly
export async function getFacebookOrInstagramData(url: string): Promise<SocialProfileData> {
  const urlObj = new URL(url);
  const path = urlObj.pathname.split('/').filter(p => p);

  if (urlObj.hostname.includes('facebook.com')) {
    return getFacebookPageData(path[0]);
  } else if (urlObj.hostname.includes('instagram.com')) {
    return getInstagramProfileData(path[0]);
  }

  throw new Error('Invalid Facebook or Instagram URL');
}