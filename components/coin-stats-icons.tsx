import { DollarSign, BarChart2, Users, TrendingUp, PiggyBank } from 'lucide-react';
import React from 'react';

export function CoinStatsIcons({ price, marketCap, volume24h, uniqueHolders, earnings }: {
  price: string | null,
  marketCap: string | null,
  volume24h: string | null,
  uniqueHolders: number | null,
  earnings: string | null
}) {
  // Helper to show 0 as 0, only show -- if null or undefined
  const showStat = (val: string | number | null | undefined, format?: (v: number|string) => string) => {
    if (val === null || val === undefined || val === '') return '--';
    if (typeof val === 'number' && isNaN(val)) return '--';
    if (format) return format(val);
    return val.toString();
  };
  return (
    <div className="grid grid-cols-5 gap-x-2 gap-y-1 text-xs text-gray-700">
      <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{showStat(price, v => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })}`)}</div>
      <div className="flex items-center gap-1"><BarChart2 className="h-4 w-4" />{showStat(marketCap, v => `$${Number(v).toLocaleString()}`)}</div>
      <div className="flex items-center gap-1"><TrendingUp className="h-4 w-4" />{showStat(volume24h, v => `$${Number(v).toLocaleString()}`)}</div>
      <div className="flex items-center gap-1"><Users className="h-4 w-4" />{showStat(uniqueHolders)}</div>
      <div className="flex items-center gap-1"><PiggyBank className="h-4 w-4" />{showStat(earnings)}</div>
    </div>
  );
}
