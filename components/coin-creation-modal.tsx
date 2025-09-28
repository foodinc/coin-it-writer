"use client";

import { useState, ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Coins, FileText, Link as LinkIcon, Plus } from "lucide-react";
import { createCoin, DeployCurrency, ValidMetadataURI } from "@zoralabs/coins-sdk";
import { Address } from "viem";
import { base } from "viem/chains";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { createCoin as createCoinInDb, createOrUpdateUser } from "@/lib/supabase-queries";
import { usePrivy } from "@privy-io/react-auth";


interface ScrapedData {
  url: string;
  title: string;
  description: string;
  author: string;
  publishDate: string;
  image: string;
  content: string;
  tags: string[];
  scrapedAt: string;
}

interface CoinData {
  coinAddress: string;
  coinId: string;
  tokenName: string;
  tokenSymbol: string;
  ipfsUri: string;
  ipfsHash: string;
  gatewayUrl: string;
  coinParams: {
    name: string;
    symbol: string;
    uri: string;
    payoutRecipient: string;
    platformReferrer: string;
    chainId: number;
  };
}

interface CoinCreationModalProps {
  onCoinCreated?: (coinData: CoinData) => void;
}

function CoinCreationModal({ onCoinCreated }: CoinCreationModalProps) {
  // Blog tab state
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  // Image tab state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  // Music tab state (not implemented here, but placeholder)
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreview, setMusicPreview] = useState<string | null>(null);
  const [musicTokenName, setMusicTokenName] = useState("");
  const [musicTokenSymbol, setMusicTokenSymbol] = useState("");
  const [musicDescription, setMusicDescription] = useState("");

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { user } = usePrivy();

  // Handlers
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // Blog scrape handler (for Blog tab)
  const handleScrape = async () => {
    if (!url) {
      setError("Please enter a URL");
      return;
    }
    setIsLoading(true);
    setError("");
    setScrapedData(null);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to scrape content");
      // Add type: 'blog' to scrapedData for metadata
      setScrapedData({ ...data, type: 'blog' });
      setTokenName(data.title.substring(0, 50));
      setTokenSymbol(data.title.substring(0, 10).toUpperCase().replace(/[^A-Z]/g, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape content");
    } finally {
      setIsLoading(false);
    }
  };

  // Main render
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          Create New Coin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <Tabs defaultValue="blog" className="space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-6 w-6" />
              Launch a Coin
            </DialogTitle>
            <DialogDescription>
              Choose a coin type and get started!
            </DialogDescription>
          </DialogHeader>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="blog">Public Goods</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
          </TabsList>
          {/* Blog Tab */}
          <TabsContent value="blog">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Project URL
                </CardTitle>
                <CardDescription>
                  Enter your project URL to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project URL</label>
                  <Input
                    placeholder="https://gitcoin.com/project-link"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleScrape}
                    disabled={isLoading || !url}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Submit project
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* ...You can add scrapedData/coinData display here if needed... */}
          </TabsContent>
          {/* Image Tab */}
          <TabsContent value="image">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Create Coin from Image
                </CardTitle>
                <CardDescription>
                  Upload an image and launch a new coin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image File</label>
                  <Input type="file" accept="image/*" onChange={handleImageFileChange} />
                </div>
                {imagePreview && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preview</label>
                    <div className="border rounded-md p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="max-h-40 rounded-md" />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={imageDescription}
                    onChange={e => setImageDescription(e.target.value)}
                    placeholder="Describe your image coin..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Name</label>
                    <Input
                      value={tokenName}
                      onChange={e => setTokenName(e.target.value)}
                      placeholder="Enter token name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Symbol</label>
                    <Input
                      value={tokenSymbol}
                      onChange={e => setTokenSymbol(e.target.value.toUpperCase())}
                      placeholder="Enter symbol (e.g., IMG)"
                    />
                  </div>
                </div>
                <Button
                  disabled={!imageFile || !tokenName.trim() || !tokenSymbol.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  onClick={async () => {
                    setIsLoading(true);
                    setError("");
                    try {
                      // 1. Upload image to IPFS (Pinata or your preferred service)
                      const formData = new FormData();
                      formData.append("file", imageFile!);
                      // Add metadata as JSON
                      const metadata = {
                        name: tokenName,
                        symbol: tokenSymbol,
                        description: imageDescription,
                        type: "image",
                        createdAt: new Date().toISOString(),
                        creator: address,
                      };
                      formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
                      const pinataRes = await fetch("/api/upload-metadata", {
                        method: "POST",
                        body: formData,
                      });
                      const pinataData = await pinataRes.json();
                      if (!pinataRes.ok) throw new Error(pinataData.error || "Failed to upload image to IPFS");
                      const ipfsUri = pinataData.ipfsUri;
                      // 2. Mint the coin on Zora
                      if (!walletClient || !publicClient || !address) throw new Error("Wallet not connected");
                      const deployParams = {
                        name: tokenName,
                        symbol: tokenSymbol,
                        uri: ipfsUri,
                        payoutRecipient: address as Address,
                        platformReferrer: address as Address,
                        chainId: base.id,
                      };
                      const txResult = await createCoin(
                        deployParams,
                        walletClient,
                        publicClient
                      );
                      const contractAddress = txResult.address;
                      if (!contractAddress) throw new Error("Failed to get contract address from deployment");
                      // 3. Save coin to DB
                      const coinRes = await createCoinInDb({
                        name: tokenName,
                        symbol: tokenSymbol,
                        coin_address: contractAddress,
                        creator_wallet: address,
                        metadata: {
                          ...metadata,
                          ipfsUri,
                          ipfsHash: pinataData.ipfsHash,
                          gatewayUrl: pinataData.gatewayUrl,
                        },
                      });
                      setCoinData({
                        coinAddress: contractAddress,
                        coinId: coinRes.id,
                        tokenName: tokenName,
                        tokenSymbol: tokenSymbol,
                        ipfsUri,
                        ipfsHash: pinataData.ipfsHash,
                        gatewayUrl: pinataData.gatewayUrl,
                        coinParams: deployParams as any,
                      });
                      toast.success("Coin created successfully!");
                      if (onCoinCreated) onCoinCreated({
                        coinAddress: contractAddress,
                        coinId: coinRes.id,
                        tokenName: tokenName,
                        tokenSymbol: tokenSymbol,
                        ipfsUri,
                        ipfsHash: pinataData.ipfsHash,
                        gatewayUrl: pinataData.gatewayUrl,
                        coinParams: deployParams as any,
                      });
                    } catch (err: any) {
                      setError(err.message || "Failed to create image coin");
                      toast.error(err.message || "Failed to create image coin");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Coin...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Create Coin
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Music Tab (UI only, not functional) */}
          <TabsContent value="music">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Create Coin from Music
                </CardTitle>
                <CardDescription>
                  Upload a music file (mp3, midi, wav, aiff, aac, aviff, mpeg) and launch a coin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Music File</label>
                  <Input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/x-aiff,audio/aiff,audio/aac,audio/x-midi,audio/midi,audio/aviff"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setMusicFile(file);
                      setMusicPreview(file ? file.name : null);
                    }}
                  />
                  {musicPreview && (
                    <div className="text-xs text-gray-600">Selected: {musicPreview}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={musicDescription}
                    onChange={e => setMusicDescription(e.target.value)}
                    placeholder="Describe your music coin..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Name</label>
                    <Input
                      value={musicTokenName}
                      onChange={e => setMusicTokenName(e.target.value)}
                      placeholder="Enter token name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Symbol</label>
                    <Input
                      value={musicTokenSymbol}
                      onChange={e => setMusicTokenSymbol(e.target.value.toUpperCase())}
                      placeholder="Enter symbol (e.g., MUSIC)"
                    />
                  </div>
                </div>
                <Button
                  disabled={isLoading || !musicFile || !musicTokenName.trim() || !musicTokenSymbol.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={async () => {
                    setIsLoading(true);
                    setError("");
                    try {
                      // 1. Upload music file to IPFS (Pinata or your preferred service)
                      const formData = new FormData();
                      formData.append("file", musicFile!);
                      // Add metadata as JSON
                      const metadata = {
                        name: musicTokenName,
                        symbol: musicTokenSymbol,
                        description: musicDescription,
                        type: "music",
                        createdAt: new Date().toISOString(),
                        creator: address,
                      };
                      formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
                      const pinataRes = await fetch("/api/upload-metadata", {
                        method: "POST",
                        body: formData,
                      });
                      const pinataData = await pinataRes.json();
                      if (!pinataRes.ok) throw new Error(pinataData.error || "Failed to upload music to IPFS");
                      const ipfsUri = pinataData.ipfsUri;
                      // 2. Mint the coin on Zora
                      if (!walletClient || !publicClient || !address) throw new Error("Wallet not connected");
                      const deployParams = {
                        name: musicTokenName,
                        symbol: musicTokenSymbol,
                        uri: ipfsUri,
                        payoutRecipient: address as Address,
                        platformReferrer: address as Address,
                        chainId: base.id,
                      };
                      const txResult = await createCoin(
                        deployParams,
                        walletClient,
                        publicClient
                      );
                      const contractAddress = txResult.address;
                      if (!contractAddress) throw new Error("Failed to get contract address from deployment");
                      // 3. Save coin to DB
                      const coinRes = await createCoinInDb({
                        name: musicTokenName,
                        symbol: musicTokenSymbol,
                        coin_address: contractAddress,
                        creator_wallet: address,
                        metadata: {
                          ...metadata,
                          ipfsUri,
                          ipfsHash: pinataData.ipfsHash,
                          gatewayUrl: pinataData.gatewayUrl,
                        },
                      });
                      setCoinData({
                        coinAddress: contractAddress,
                        coinId: coinRes.id,
                        tokenName: musicTokenName,
                        tokenSymbol: musicTokenSymbol,
                        ipfsUri,
                        ipfsHash: pinataData.ipfsHash,
                        gatewayUrl: pinataData.gatewayUrl,
                        coinParams: deployParams as any,
                      });
                      toast.success("Music coin created successfully!");
                      if (onCoinCreated) onCoinCreated({
                        coinAddress: contractAddress,
                        coinId: coinRes.id,
                        tokenName: musicTokenName,
                        tokenSymbol: musicTokenSymbol,
                        ipfsUri,
                        ipfsHash: pinataData.ipfsHash,
                        gatewayUrl: pinataData.gatewayUrl,
                        coinParams: deployParams as any,
                      });
                    } catch (err: any) {
                      setError(err.message || "Failed to create music coin");
                      toast.error(err.message || "Failed to create music coin");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Coin...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Create Coin
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default CoinCreationModal;
