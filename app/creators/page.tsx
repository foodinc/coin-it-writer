"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

import { getAllCoins, getUser } from "@/lib/supabase-queries";
import { getCoin } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";


export default function CreatorsPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreators() {
      setLoading(true);
      // 1. Fetch all coins
      const coins = await getAllCoins(200, 0);
      // 2. Group coins by creator_wallet
      const creatorsMap: Record<string, any> = {};
      for (const coin of coins) {
        if (!creatorsMap[coin.creator_wallet]) {
          creatorsMap[coin.creator_wallet] = {
            wallet: coin.creator_wallet,
            coins: [],
            user: null,
          };
        }
        creatorsMap[coin.creator_wallet].coins.push(coin);
      }
      // 3. Fetch user info and live stats for each creator's coins
      const creatorList = await Promise.all(
        Object.values(creatorsMap).map(async (entry: any) => {
          const user = await getUser(entry.wallet);
          // Fetch live stats for each coin
          const coinsWithStats = await Promise.all(
            entry.coins.map(async (coin: any) => {
              try {
                const sdkRes = await getCoin({ address: coin.coin_address, chain: base.id });
                const zoraCoin = sdkRes.data?.zora20Token;
                return {
                  ...coin,
                  live: {
                    marketCap: zoraCoin?.marketCap ?? 0,
                    // price: (add price field here if available in zoraCoin)
                    holders: zoraCoin?.uniqueHolders ?? 0,
                    image: zoraCoin?.mediaContent?.previewImage?.medium || '',
                    createdAt: zoraCoin?.createdAt || coin.created_at,
                  },
                };
              } catch (e) {
                return { ...coin, live: { marketCap: 0, price: 0, holders: 0, image: '', createdAt: coin.created_at } };
              }
            })
          );
          return {
            ...entry,
            user,
            coins: coinsWithStats,
          };
        })
      );
      // 4. Sort coins for each creator by market cap, price, holders, created_at
      for (const creator of creatorList) {
        creator.coins.sort((a: any, b: any) => {
          // Sort by live marketCap, then price, then holders, then created_at
          const aCap = Number(a.live?.marketCap) || 0;
          const bCap = Number(b.live?.marketCap) || 0;
          if (bCap !== aCap) return bCap - aCap;
          const aPrice = Number(a.live?.price) || 0;
          const bPrice = Number(b.live?.price) || 0;
          if (bPrice !== aPrice) return bPrice - aPrice;
          const aHolders = Number(a.live?.holders) || 0;
          const bHolders = Number(b.live?.holders) || 0;
          if (bHolders !== aHolders) return bHolders - aHolders;
          return new Date(b.live?.createdAt || b.created_at).getTime() - new Date(a.live?.createdAt || a.created_at).getTime();
        });
      }
      // 5. Sort creators by their top coin's live market cap
      creatorList.sort((a, b) => {
        const aCap = Number(a.coins[0]?.live?.marketCap) || 0;
        const bCap = Number(b.coins[0]?.live?.marketCap) || 0;
        return bCap - aCap;
      });
      setCreators(creatorList);
      setLoading(false);
    }
    fetchCreators();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-10 px-4">
  <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Creators</h1>
        <p className="mb-8 text-gray-700">Ranked by their coins' market cap, price, holders, and creation date/time.</p>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {creators.map((creator, idx) => (
              <Card key={creator.wallet} className="flex flex-col md:flex-row items-center gap-6 p-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={creator.coins[0]?.live?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${creator.wallet}`} alt={creator.user?.email || creator.wallet} />
                  <AvatarFallback>{creator.user?.email?.[0]?.toUpperCase() || creator.wallet?.[2]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 w-full">
                  <CardHeader className="p-0 mb-2 flex flex-col md:flex-row md:items-center md:gap-4">
                    <CardTitle className="text-xl font-semibold">
                      {creator.user?.email?.split("@")[0] || creator.wallet.slice(0, 6)}
                      <span className="text-gray-500 text-base font-normal ml-2">{creator.user?.email ? `@${creator.user?.email.split("@")[0]}` : creator.wallet}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-gray-600">
                            <th className="px-2 py-1 text-left">Coin</th>
                            <th className="px-2 py-1 text-left">Symbol</th>
                            <th className="px-2 py-1 text-right">Market Cap</th>
                            {/* <th className="px-2 py-1 text-right">Price</th> */}
                            <th className="px-2 py-1 text-right">Holders</th>
                            <th className="px-2 py-1 text-right">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creator.coins.map((coin: any) => (
                            <tr key={coin.symbol}>
                              <td className="px-2 py-1 flex items-center gap-2">
                                {coin.live?.image && <img src={coin.live.image} alt={coin.name} className="w-6 h-6 rounded-full" />}
                                {coin.name}
                              </td>
                              <td className="px-2 py-1">{coin.symbol}</td>
                              <td className="px-2 py-1 text-right">${Number(coin.live?.marketCap || 0).toLocaleString()}</td>
                              {/* <td className="px-2 py-1 text-right">${Number(coin.live?.price || 0)}</td> */}
                              <td className="px-2 py-1 text-right">{coin.live?.holders || 0}</td>
                              <td className="px-2 py-1 text-right">{new Date(coin.live?.createdAt || coin.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
