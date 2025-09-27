
"use client";
import { useEffect, useState } from "react";
import { fetchTopCoins } from "@/lib/zora-explore";

export default function LeaderboardPage() {
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopCoins(10).then((data) => {
      setCoins(data);
      setLoading(false);
    });
  }, []);

  return (
  <main className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>
      <p className="mb-6 text-gray-700">See the top-performing coins, creators, and channels on the platform. Track rankings and discover the most successful projects!</p>
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center text-gray-500">Loading leaderboard...</div>
        ) : coins.length === 0 ? (
          <div className="text-center text-gray-500">No leaderboard data found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Symbol</th>
                <th className="py-2 text-left">Price</th>
                <th className="py-2 text-left">Market Cap</th>
                <th className="py-2 text-left">Holders</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin, i) => (
                <tr key={coin.address} className="border-b hover:bg-gray-50">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2 font-medium">{coin.name}</td>
                  <td className="py-2">{coin.symbol}</td>
                  <td className="py-2">{coin.price ? `$${coin.price}` : '--'}</td>
                  <td className="py-2">{coin.marketCap ? `$${coin.marketCap}` : '--'}</td>
                  <td className="py-2">{coin.uniqueHolders ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
