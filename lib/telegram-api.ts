export interface TelegramChatData {
  id: number;
  type: 'channel' | 'group' | 'supergroup';
  title: string;
  username?: string;
  description?: string;
  photoUrl?: string;
  memberCount?: number;
  isVerified?: boolean;
  linkedChatId?: number; // For channels with discussion groups
  metrics: {
    messageCount?: number;
    subscriberCount?: number;
    adminCount?: number;
  };
}

export interface TelegramMessageStats {
  totalMessages: number;
  dailyMessages: number;
  weeklyMessages: number;
  monthlyMessages: number;
}

async function getChatPhoto(chatId: number, botToken: string): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatPhoto?chat_id=${chatId}`
    );
    
    if (!response.ok) return undefined;
    
    const data = await response.json();
    if (!data.ok || !data.result?.big_file_id) return undefined;
    
    // Get photo file path
    const fileResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${data.result.big_file_id}`
    );
    
    if (!fileResponse.ok) return undefined;
    
    const fileData = await fileResponse.json();
    if (!fileData.ok || !fileData.result?.file_path) return undefined;
    
    return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
  } catch (error) {
    console.error('Error fetching Telegram chat photo:', error);
    return undefined;
  }
}

async function getMessageStats(chatId: number, botToken: string): Promise<TelegramMessageStats> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;
    const weekAgo = now - 604800;
    const monthAgo = now - 2592000;

    const [dailyMessages, weeklyMessages, monthlyMessages] = await Promise.all([
      fetch(`https://api.telegram.org/bot${botToken}/getChatMessageCount?chat_id=${chatId}&from=${dayAgo}&to=${now}`),
      fetch(`https://api.telegram.org/bot${botToken}/getChatMessageCount?chat_id=${chatId}&from=${weekAgo}&to=${now}`),
      fetch(`https://api.telegram.org/bot${botToken}/getChatMessageCount?chat_id=${chatId}&from=${monthAgo}&to=${now}`)
    ]);

    return {
      totalMessages: 0, // Total messages not available through API
      dailyMessages: (await dailyMessages.json())?.result?.message_count || 0,
      weeklyMessages: (await weeklyMessages.json())?.result?.message_count || 0,
      monthlyMessages: (await monthlyMessages.json())?.result?.message_count || 0
    };
  } catch (error) {
    console.error('Error fetching Telegram message stats:', error);
    return {
      totalMessages: 0,
      dailyMessages: 0,
      weeklyMessages: 0,
      monthlyMessages: 0
    };
  }
}

async function getChatAdministrators(chatId: number, botToken: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatAdministrators?chat_id=${chatId}`
    );
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    return data.ok ? data.result.length : 0;
  } catch (error) {
    console.error('Error fetching Telegram administrators:', error);
    return 0;
  }
}

export async function getTelegramChatData(username: string): Promise<TelegramChatData> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram Bot token not configured');
  }

  try {
    // Get chat information
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChat?chat_id=@${username}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Telegram chat data');
    }

    const data = await response.json();
    if (!data.ok || !data.result) {
      throw new Error('Invalid Telegram API response');
    }

    const chat = data.result;
    
    // Parallel requests for additional data
    const [photoUrl, messageStats, adminCount] = await Promise.all([
      getChatPhoto(chat.id, process.env.TELEGRAM_BOT_TOKEN),
      getMessageStats(chat.id, process.env.TELEGRAM_BOT_TOKEN),
      getChatAdministrators(chat.id, process.env.TELEGRAM_BOT_TOKEN)
    ]);

    return {
      id: chat.id,
      type: chat.type as 'channel' | 'group' | 'supergroup',
      title: chat.title,
      username: chat.username,
      description: chat.description,
      photoUrl,
      memberCount: chat.member_count,
      isVerified: chat.is_verified || false,
      linkedChatId: chat.linked_chat_id,
      metrics: {
        messageCount: messageStats.totalMessages,
        subscriberCount: chat.member_count,
        adminCount,
      }
    };
  } catch (error) {
    console.error('Error fetching Telegram chat data:', error);
    throw error;
  }
}

// Helper to extract username from Telegram URL
export function extractTelegramUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('t.me') && !urlObj.hostname.includes('telegram.me')) {
      return null;
    }

    const path = urlObj.pathname.split('/').filter(p => p);
    return path[0] || null;
  } catch {
    return null;
  }
}