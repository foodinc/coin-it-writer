import { getCoinsMostValuable } from '@zoralabs/coins-sdk';
import { useEffect, useState } from 'react';

// Fetch ALL coins with pagination for accurate total marketcap
async function fetchAllCoinsMostValuable() {
  let allCoins: any[] = [];
  let cursor = undefined;
  const pageSize = 50;
  do {
    const response = await getCoinsMostValuable({ count: pageSize, after: cursor });
    const edges = response.data?.exploreList?.edges || [];
    allCoins = [...allCoins, ...edges.map((edge: any) => edge.node)];
    cursor = response.data?.exploreList?.pageInfo?.endCursor;
    if (!cursor || edges.length === 0) break;
  } while (true);
  return allCoins;
}

export function useTotalMarketCapRealtimeAccurate() {
  const [totalMarketCap, setTotalMarketCap] = useState<number | null>(null);
  useEffect(() => {
    let isMounted = true;
    async function fetchMarketCap() {
      try {
        const coins = await fetchAllCoinsMostValuable();
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
    const interval = setInterval(fetchMarketCap, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  return totalMarketCap;
}
