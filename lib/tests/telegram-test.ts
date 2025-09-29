import { getTelegramChatData } from '@/lib/telegram-api';

// Test function for Telegram integration
export async function testTelegramAPI(username: string) {
  try {
    console.log('Testing Telegram API for username:', username);
    const chatData = await getTelegramChatData(username);
    console.log('Telegram Chat Data:', JSON.stringify(chatData, null, 2));
    return chatData;
  } catch (error) {
    console.error('Telegram API test failed:', error);
    throw error;
  }
}