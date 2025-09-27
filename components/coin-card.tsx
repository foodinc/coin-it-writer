'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'yellow-patient-cheetah-559.mypinata.cloud';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Calendar, User, Coins, Copy, Check, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { parseEther } from "viem";
import {
  Account,
  WalletClient,
  PublicClient,
} from "viem";
import {  useWallets, usePrivy } from "@privy-io/react-auth";
import {  tradeCoin, TradeParameters } from "@zoralabs/coins-sdk";



import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

export type GenericPublicClient = PublicClient;

interface CoinCardProps {
  coin: {
    id: string;
    name: string;
    symbol: string;
    address: string;
    creator: string;
    createdAt: string;
    metadata?: {
      title?: string;
      description?: string;
      image?: string;
      originalUrl?: string;
      author?: string;
    };
    ipfsUri?: string;
  };
  isOwnCoin?: boolean;
}


export default function CoinCard({ coin, isOwnCoin = false }: CoinCardProps) {
  const [copied, setCopied] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fixed card size for uniformity
  const CARD_WIDTH = 260;
  const CARD_HEIGHT = 420;
  const [txHash, setTxHash] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [ethAmount, setEthAmount] = useState("0.0001");
  const [price, setPrice] = useState<string | null>(null);
  const [marketCap, setMarketCap] = useState<string | null>(null);
  const [volume24h, setVolume24h] = useState<string | null>(null);
  const [uniqueHolders, setUniqueHolders] = useState<number | null>(null);
  const [creatorEarnings, setCreatorEarnings] = useState<Array<{ amount: { currencyAddress: string; amountRaw: string; amountDecimal: number }; amountUsd?: string }> | null>(null);

  const { wallets } = useWallets();
  const { ready } = usePrivy();
  const account = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    let isMounted = true;
    async function fetchCoinStats() {
      try {
        const sdk = await import("@zoralabs/coins-sdk");
        const setApiKey = sdk.setApiKey;
        const getCoin = sdk.getCoin;
        if (setApiKey && getCoin) {
          setApiKey("zora_api_85edebb6a9cb7daa0d8124db4a60d946fb87127d5ab15897458a4c224de8c0bc");
          const coinData = await getCoin({ address: coin.address });
          const stats = coinData?.data?.zora20Token;
          if (isMounted && stats) {
            setPrice(stats.tokenPrice?.priceInUsdc ?? null);
            setMarketCap(stats.marketCap ?? null);
            setVolume24h(stats.volume24h ?? null);
            setUniqueHolders(stats.uniqueHolders ?? null);
            setCreatorEarnings(stats.creatorEarnings ?? null);
          }
        }
      } catch (e) {
        // Optionally handle error
      }
    }
    if (typeof window !== "undefined") fetchCoinStats();
    return () => { isMounted = false; };
  }, [coin.address]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleTrade = async (coinAddress: `0x${string}`) => {
    if (!ready) {
      setError("Please log in with Privy first");
      return;
    }
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setError("Please enter a valid ETH amount");
      return;
    }
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const tradeParams: TradeParameters = {
        sell: { type: "eth" },
        buy: { type: "erc20", address: coinAddress as `0x${string}` },
        amountIn: parseEther(ethAmount),
        slippage: 0.05,
        sender: account.address as `0x${string}`,
      };
      const receipt = await tradeCoin({
        tradeParameters: tradeParams,
        walletClient: walletClient as WalletClient,
        publicClient: publicClient as GenericPublicClient,
        account: walletClient?.account as Account,
      });
      setTxHash(receipt.transactionHash);
    } catch (err: unknown) {
      console.log(err)
      setError((err as Error).message || "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${isOwnCoin ? 'border-purple-200 bg-purple-50/50' : ''}`}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, minWidth: CARD_WIDTH, minHeight: CARD_HEIGHT, maxWidth: CARD_WIDTH, maxHeight: CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}
    >
      <CardHeader className="pb-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-1 text-base font-semibold truncate">
              <Coins className="h-4 w-4" />
              <span className="truncate">{coin.name}</span>
              {isOwnCoin && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 ml-1">Your Coin</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
              <span className="truncate">{formatAddress(coin.address)}</span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleCopy(coin.address)}
            className="ml-1 h-7 w-7"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 px-3 py-2">
        {/* Compact Coin Stats */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-700">
          <div><span className="font-semibold">Price</span>: {price !== null ? `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })}` : '--'}</div>
          <div><span className="font-semibold">MCap</span>: {marketCap !== null ? `$${marketCap}` : '--'}</div>
          <div><span className="font-semibold">Vol 24h</span>: {volume24h !== null ? `$${volume24h}` : '--'}</div>
          <div><span className="font-semibold">Holders</span>: {uniqueHolders !== null ? uniqueHolders : '--'}</div>
        </div>
        <div className="text-xs text-gray-700">
          <span className="font-semibold">Earnings</span>: {creatorEarnings && creatorEarnings.length > 0 ? (
            <span>{creatorEarnings[0].amount.amountDecimal} ({creatorEarnings[0].amount.currencyAddress}){creatorEarnings[0].amountUsd ? ` ≈ $${creatorEarnings[0].amountUsd}` : ''}</span>
          ) : '--'}
        </div>
        {/* Blog Metadata (compact) */}
        {coin.metadata && (
          <div className="space-y-1">
            {coin.metadata.title && (
              <div className="truncate text-xs text-gray-800 font-medium">{coin.metadata.title}</div>
            )}
            {coin.metadata.description && (
              <div className="truncate text-xs text-gray-500">{coin.metadata.description}</div>
            )}
            {coin.metadata.image && (
              <div className="rounded-md overflow-hidden" style={{ width: '100%', height: 100 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(() => {
                    if (!coin.metadata.image.startsWith('ipfs://')) return coin.metadata.image;
                    const hash = coin.metadata.image.replace('ipfs://', '');
                    return `https://ipfs.zora.co/ipfs/${hash}`;
                  })()}
                  alt={coin.metadata.title || coin.name}
                  width={CARD_WIDTH}
                  height={100}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    // Log error details for debugging
                    // eslint-disable-next-line no-console
                    console.error('CoinCard image failed to load:', {
                      src: e.currentTarget.src,
                      alt: e.currentTarget.alt,
                      coin,
                    });
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Coin Details (compact) */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 mt-1">
          <div className="flex items-center gap-1 text-gray-600">
            <User className="h-3 w-3" />
            <span>Creator</span>
          </div>
          <span className="font-mono">{formatAddress(coin.creator)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="font-semibold">Symbol</span>: {coin.symbol}
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>Created</span>: {formatDate(coin.createdAt)}
          </div>
        </div>

        {/* Actions (compact) */}
        <div className="flex gap-1 pt-1">
          {coin.ipfsUri && (
            <Button variant="outline" size="xs" asChild className="flex-1 px-1 py-1 text-xs h-7">
              <a href={coin.ipfsUri} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Metadata
              </a>
            </Button>
          )}
          {!isOwnCoin && (
            <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
              <DialogTrigger asChild>
               <Button
  variant="default"
  size="xs"
  className="flex-1 px-1 py-1 text-xs h-7 bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-blue-400"
>
  <TrendingUp className="h-3 w-3 mr-1" />
  Trade
</Button>

              </DialogTrigger>
              <DialogContent className="sm:max-w-xs p-3">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Trade {coin.symbol}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-medium">Coin</span>
                      <span>{coin.name}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-medium">Symbol</span>
                      <span>${coin.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Address</span>
                      <span className="font-mono">{formatAddress(coin.address)}</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ethAmount" className="text-xs font-medium">
                      ETH to Trade
                    </Label>
                    <Input
                      id="ethAmount"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      placeholder="ETH amount"
                      className="mt-1 text-xs h-7"
                    />
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg text-xs">
                    <div className="flex justify-between mb-1">
                      <span>You pay:</span>
                      <span>{ethAmount} ETH</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>You receive:</span>
                      <span>${coin.symbol} tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Slippage:</span>
                      <span>5%</span>
                    </div>
                  </div>
                  {!ready || !wallets[0] ? (
                    <div className="p-2 bg-yellow-50 rounded-lg text-xs">
                      <p className="text-yellow-800">Please log in with Privy to trade.</p>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => handleTrade(coin.address as `0x${string}`)}
                      disabled={loading || !ethAmount || parseFloat(ethAmount) <= 0}
                      className="w-full text-xs h-7"
                    >
                      {loading ? "Trading..." : `Trade ${ethAmount} ETH`}
                    </Button>
                  )}
                  {txHash && (
                    <div className="p-2 bg-green-50 rounded-lg text-xs">
                      <p className="text-green-800">✅ Success!</p>
                      <p className="font-mono break-all">{txHash}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 