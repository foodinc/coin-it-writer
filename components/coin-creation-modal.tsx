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
  // Music tab state
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreview, setMusicPreview] = useState<string | null>(null);
  const [musicTokenName, setMusicTokenName] = useState("");
  const [musicTokenSymbol, setMusicTokenSymbol] = useState("");
  const [musicDescription, setMusicDescription] = useState("");

  // Channel tab state
  const [channelUrl, setChannelUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [channelData, setChannelData] = useState<null | {
    name: string;
    description: string;
    platformType: string;
    url: string;
    followers?: number;
    subscribers?: number;
    avatarUrl?: string;
    verified?: boolean;
    handle?: string;
  }>(null);
  const [manualChannelData, setManualChannelData] = useState({
    name: "",
    handle: "",
    platformType: "youtube",
    description: "",
    followers: "",
    profileUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [channelTokenSymbol, setChannelTokenSymbol] = useState("");
  const [channelDescription, setChannelDescription] = useState("");

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

  const handleManualSubmit = async () => {
    if (!manualChannelData.name) {
      setError("Please enter a channel name");
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      // Create channel data from manual input
      const channelDataFromManual = {
        name: manualChannelData.name,
        description: manualChannelData.description,
        platformType: manualChannelData.platformType,
        url: manualChannelData.profileUrl,
        handle: manualChannelData.handle,
        followers: parseInt(manualChannelData.followers) || 0,
        subscribers: parseInt(manualChannelData.followers) || 0,
      };

      setChannelData(channelDataFromManual);
      
      // Generate metadata
      const metadata = {
        name: manualChannelData.name,
        description: manualChannelData.description,
        type: "channel",
        channelData: {
          platform: manualChannelData.platformType,
          url: manualChannelData.profileUrl,
          importedAt: new Date().toISOString(),
          metrics: {
            followers: parseInt(manualChannelData.followers) || 0,
            subscribers: parseInt(manualChannelData.followers) || 0,
          }
        },
        external_url: manualChannelData.profileUrl,
        createdAt: new Date().toISOString(),
        creator: address,
      };

      // Upload metadata and avatar to IPFS
      const formData = new FormData();

      // If we have an avatar file, add it
      if (avatarFile) {
        formData.append("image", avatarFile);
      }

      formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));

      const pinataRes = await fetch("/api/upload-metadata", {
        method: "POST",
        body: formData,
      });

      if (!pinataRes.ok) {
        throw new Error("Failed to upload channel metadata to IPFS");
      }

      const pinataData = await pinataRes.json();

      // Create the coin using the metadata
      if (!walletClient || !publicClient || !address) {
        throw new Error("Wallet not connected");
      }

      // Generate token symbol from channel name
      const symbol = manualChannelData.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 10) || 'CHNL';

      setChannelTokenSymbol(symbol);

      const deployParams = {
        name: manualChannelData.name,
        symbol: symbol,
        uri: pinataData.ipfsUri,
        payoutRecipient: address as Address,
        platformReferrer: address as Address,
        chainId: base.id,
      };

      const txResult = await createCoin(deployParams, walletClient, publicClient);

      // Store in database
      await createCoinInDb({
        name: manualChannelData.name,
        symbol: symbol,
        address: txResult.address,
        creator: address,
        ipfsUri: pinataData.ipfsUri,
        ipfsHash: pinataData.ipfsHash,
        gatewayUrl: pinataData.gatewayUrl,
        metadata: metadata,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel coin");
    } finally {
      setIsImporting(false);
    }
  };

  const handleChannelImport = async () => {
    if (!channelUrl) {
      setError("Please enter the channel URL");
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      const response = await fetch("/api/import-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: channelUrl.trim() 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Failed to import channel");
      
      // Set channel data and form values
      setChannelData(data);
      
      // Generate ticker symbol from URL
      const generateTickerFromUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          let ticker = '';
          
          // Get channel identifier from URL
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          ticker = pathParts[pathParts.length - 1] || urlObj.hostname.split('.')[0];
          
          // Clean up ticker
          ticker = ticker.replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
                       .toUpperCase()  // Convert to uppercase
                       .slice(0, 10);  // Limit to 10 characters
          
          return ticker || 'CHNL';  // Fallback if ticker is empty
        } catch {
          return 'CHNL';
        }
      };

      // Pre-fill the form fields with channel data
      setChannelTokenSymbol(generateTickerFromUrl(data.url));
      
      // Set description from imported data
      if (data.description) {
        setChannelDescription(data.description);
      }

      // Create metadata for IPFS
      const metadata = {
        name: channelData.name,
        symbol: channelTokenSymbol,
        description: channelDescription,
        type: "channel",
        channelData: {
          platform: channelData.platformType,
          url: channelData.url,
          importedAt: new Date().toISOString(),
          metrics: {
            followers: channelData.followers,
            subscribers: channelData.subscribers,
            statistics: channelData.statistics
          }
        },
        image: channelData.avatarUrl,
        image_url: channelData.avatarUrl, // Zora also uses this field
        image_details: {
          size: 600,
          mimeType: "image/jpeg",
          sourceType: "avatar",
          source: channelData.platformType
        },
        external_url: channelData.url,
        createdAt: new Date().toISOString(),
        creator: address,
      };

      // Upload metadata and avatar to IPFS
      const formData = new FormData();

      // If we have an avatar URL, fetch and add it to the form data
      if (channelData.avatarUrl) {
        try {
          const avatarResponse = await fetch(channelData.avatarUrl);
          if (avatarResponse.ok) {
            const avatarBlob = await avatarResponse.blob();
            formData.append("image", avatarBlob);
          }
        } catch (error) {
          console.error('Error fetching avatar:', error);
          // Continue without avatar if fetch fails
        }
      }

      formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));

      const pinataRes = await fetch("/api/upload-metadata", {
        method: "POST",
        body: formData,
      });

      if (!pinataRes.ok) {
        throw new Error("Failed to upload channel metadata to IPFS");
      }

      const pinataData = await pinataRes.json();
      const ipfsUri = pinataData.ipfsUri;

      // Create the coin on Zora
      if (!walletClient || !publicClient || !address) {
        throw new Error("Wallet not connected");
      }

      const deployParams = {
        name: channelData.name,
        symbol: channelTokenSymbol,
        uri: ipfsUri,
        payoutRecipient: address as Address,
        platformReferrer: address as Address,
        chainId: base.id,
      };

      const txResult = await createCoin(deployParams, walletClient, publicClient);

      // Store in database
      const coinData = await createCoinInDb({
        name: channelTokenName,
        symbol: channelTokenSymbol,
        address: txResult.address,
        creator: address,
        ipfsUri: ipfsUri,
        ipfsHash: pinataData.ipfsHash,
        gatewayUrl: pinataData.gatewayUrl,
        metadata: metadata,
      });

      // Set token name and symbol for coin creation
      setTokenName(data.name.substring(0, 50));
      setTokenSymbol(data.name.substring(0, 10).toUpperCase().replace(/[^A-Z]/g, ""));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import channel");
      toast.error(err instanceof Error ? err.message : "Failed to import channel");
    } finally {
      setIsImporting(false);
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
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="blog">Public Goods</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
            <TabsTrigger value="channel">Channel</TabsTrigger>
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
                    setCoinData(null);
                    try {
                      console.log('[LegacyCoin] Starting image coin creation');
                      const formData = new FormData();
                      formData.append("image", imageFile!);
                      formData.append("name", tokenName);
                      formData.append("symbol", tokenSymbol);
                      const pinataRes = await fetch("/api/upload-metadata", {
                        method: "POST",
                        body: formData,
                      });
                      const pinataData = await pinataRes.json();
                      console.log('[LegacyCoin] Pinata response', pinataData);
                      console.log('[LegacyCoin] PinataData keys', Object.keys(pinataData));
                      if (!pinataRes.ok) throw new Error(pinataData.error || "Failed to upload image to IPFS");
                      const ipfsUri = pinataData.ipfsUri;
                      console.log('[LegacyCoin] IPFS URI', ipfsUri);
                      if (!walletClient || !publicClient || !address) throw new Error("Wallet not connected");
                      const deployParams = {
                        name: tokenName,
                        symbol: tokenSymbol,
                        uri: ipfsUri,
                        payoutRecipient: address as Address,
                        platformReferrer: address as Address,
                        chainId: base.id,
                      };
                      console.log('[LegacyCoin] Deploy params', deployParams);
                      const txResult = await createCoin(
                        deployParams,
                        walletClient,
                        publicClient
                      );
                      console.log('[LegacyCoin] Coin created onchain', txResult);
                      const contractAddress = txResult.address;
                      if (!contractAddress) throw new Error("Failed to get contract address from deployment");
                      const coinRes = await createCoinInDb({
                        name: tokenName,
                        symbol: tokenSymbol,
                        coin_address: contractAddress,
                        creator_wallet: address,
                        metadata: {
                          ...(pinataData.metadata || {}),
                          ipfsUri,
                          ipfsHash: pinataData.ipfsHash,
                          gatewayUrl: pinataData.gatewayUrl,
                        },
                      });
                      console.log('[LegacyCoin] Supabase insert result', coinRes);
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
                      console.error('[LegacyCoin] Error', err);
                      setError(err.message || "Failed to create image coin");
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
                    setCoinData(null);
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

          {/* Channel Tab */}
          <TabsContent value="channel">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Import Social Media Channel
                </CardTitle>
                <CardDescription>
                  Turn your social media presence into a coin by importing your channel or page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-end space-x-2 mb-4">
                  <label className="text-sm font-medium">Manual Input</label>
                  <input
                    type="checkbox"
                    checked={isManualMode}
                    onChange={(e) => setIsManualMode(e.target.checked)}
                    className="ml-2"
                  />
                </div>

                {!isManualMode ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Social Media URL</label>
                    <Input
                      placeholder="Paste your social media page or channel URL"
                      type="url"
                      value={channelUrl}
                    onChange={(e) => {
                      setChannelUrl(e.target.value);
                      // Clear existing data when URL changes
                      if (channelData) {
                        setChannelData(null);
                        setChannelDescription("");
                        setChannelTokenSymbol("");
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Supported platforms: YouTube, Twitter, Instagram, Facebook, TikTok, Twitch, etc.
                  </p>
                </div>
                {channelData && (
                  <div className="p-4 bg-purple-50 rounded-lg space-y-2">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        {channelData.avatarUrl && (
                          <img 
                            src={channelData.avatarUrl} 
                            alt={channelData.name}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{channelData.name}</h4>
                            {channelData.verified && (
                              <Badge variant="secondary" className="text-xs bg-blue-100">
                                Verified
                              </Badge>
                            )}
                          </div>
                          {channelData.handle && (
                            <div className="text-sm text-gray-500">@{channelData.handle}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize text-xs ml-auto">
                          {channelData.platformType}
                        </Badge>
                      </div>

                      <div className="flex gap-4 mb-3">
                        {(channelData.followers !== undefined || channelData.subscribers !== undefined) && (
                          <div className="text-sm">
                            <div className="font-semibold">
                              {(channelData.followers || channelData.subscribers || 0).toLocaleString()}
                            </div>
                            <div className="text-gray-500">
                              {channelData.platformType === 'youtube' ? 'Subscribers' : 
                               channelData.platformType === 'telegram' ? 'Members' : 'Followers'}
                            </div>
                          </div>
                        )}
                        {channelData.statistics?.views !== undefined && (
                          <div className="text-sm">
                            <div className="font-semibold">
                              {channelData.statistics.views.toLocaleString()}
                            </div>
                            <div className="text-gray-500">Views</div>
                          </div>
                        )}
                        {channelData.statistics?.posts !== undefined && (
                          <div className="text-sm">
                            <div className="font-semibold">
                              {channelData.statistics.posts.toLocaleString()}
                            </div>
                            <div className="text-gray-500">
                              {channelData.platformType === 'youtube' ? 'Videos' : 'Posts'}
                            </div>
                          </div>
                        )}
                        {channelData.statistics?.following !== undefined && (
                          <div className="text-sm">
                            <div className="font-semibold">
                              {channelData.statistics.following.toLocaleString()}
                            </div>
                            <div className="text-gray-500">Following</div>
                          </div>
                        )}
                        {channelData.statistics?.messageStats && (
                          <div className="text-sm">
                            <div className="font-semibold">
                              {channelData.statistics.messageStats.daily?.toLocaleString()}
                            </div>
                            <div className="text-gray-500">Daily Messages</div>
                          </div>
                        )}
                        {channelData.statistics?.admins !== undefined && channelData.platformType === 'telegram' && (
                          <div className="text-sm">
                            <div className="font-semibold">
                              {channelData.statistics.admins.toLocaleString()}
                            </div>
                            <div className="text-gray-500">Admins</div>
                          </div>
                        )}
                      </div>
                      {channelData.chatType && (
                        <div className="mb-3">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {channelData.chatType}
                          </Badge>
                        </div>
                      )}

                      {channelData.description && (
                        <p className="text-sm text-gray-600 mb-3">{channelData.description}</p>
                      )}
                      
                      <a 
                        href={channelData.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{channelData.url}</span>
                      </a>
                    </div>
                  </div>
                )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Channel Symbol</label>
                      <div className="relative">
                        <Input
                          placeholder="CHNL"
                          value={channelTokenSymbol}
                          readOnly
                          className="bg-gray-50"
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                          <span className="text-xs text-gray-500">Auto-generated from URL</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        The token symbol is automatically generated from your channel URL to ensure uniqueness
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Channel Description</label>
                      <Textarea
                        placeholder={channelData ? "No description available from channel..." : "Waiting for channel data..."}
                        value={channelDescription}
                        onChange={(e) => setChannelDescription(e.target.value)}
                        className={channelData?.description ? "bg-gray-50" : ""}
                      />
                      {channelData?.description && (
                        <p className="text-xs text-gray-500">
                          Description automatically imported from channel
                        </p>
                      )}
                    </div>                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={!channelUrl || isImporting || !channelData || !channelTokenSymbol}
                    onClick={handleChannelImport}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Channel Coin...
                      </>
                    ) : (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        Create Channel Coin
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default CoinCreationModal;
