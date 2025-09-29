declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    YOUTUBE_API_KEY: string;
    TWITTER_BEARER_TOKEN: string;
    FACEBOOK_ACCESS_TOKEN: string;
    TIKTOK_ACCESS_TOKEN: string;
  }
}