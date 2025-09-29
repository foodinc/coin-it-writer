import { NextResponse } from 'next/server';
import { testTelegramAPI } from '@/lib/tests/telegram-test';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
  }

  try {
    const result = await testTelegramAPI(username);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ error: 'Failed to fetch Telegram data' }, { status: 500 });
  }
}