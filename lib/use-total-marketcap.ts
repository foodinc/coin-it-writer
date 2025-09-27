import { fetchTopCoins } from '@/lib/zora-explore';
import { useEffect, useState } from 'react';

export function useTotalMarketCapRealtime() {
  const [totalMarketCap, setTotalMarketCap] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchMarketCap() {
      try {
        // Fetch a large number to cover all coins (adjust as needed)
        const coins = await fetchTopCoins(100);
        const total = coins.reduce((sum: number, coin: any) => {
          const cap = parseFloat(coin.marketCap || '0');
          return sum + (isNaN(cap) ? 0 : cap);
        }, 0);
        if (isMounted) setTotalMarketCap(total);
      } catch (e) {
        if (isMounted) setTotalMarketCap(null);
      }
    }
    fetchMarketCap();
    // Poll every 20 seconds for real-time updates
    const interval = setInterval(fetchMarketCap, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return totalMarketCap;
}
