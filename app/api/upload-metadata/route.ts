
import { NextRequest, NextResponse } from 'next/server';
import { pinata } from '@/lib/pinata';
import { notifyTelegramEvent } from '@/lib/telegram-events';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart/form-data (image coin or channel with avatar)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const imageFile = formData.get('image');
      const metadataJson = formData.get('metadata')?.toString();

      // If we have metadata JSON, this is a channel import
      if (metadataJson) {
        const metadata = JSON.parse(metadataJson);
        
        // If we have an avatar image, upload it first
        if (imageFile && typeof imageFile !== 'string') {
          const { cid: imageCid } = await pinata.upload.public.file(imageFile);
          const imageIpfsUri = `ipfs://${imageCid}`;
          const imageGatewayUrl = await pinata.gateways.public.convert(imageCid);
          
          // Update metadata with IPFS image URLs
          metadata.image = imageIpfsUri;
          metadata.image_url = imageGatewayUrl;
        }

        // Upload the complete metadata
        const jsonString = JSON.stringify(metadata, null, 2);
        const metaFile = new File([jsonString], `channel-metadata-${Date.now()}.json`, {
          type: 'application/json',
        });
        const { cid } = await pinata.upload.public.file(metaFile);
        const gatewayUrl = await pinata.gateways.public.convert(cid);

        return NextResponse.json({
          ipfsUri: `ipfs://${cid}`,
          ipfsHash: cid,
          gatewayUrl,
          metadata
        });
      }
      
      // Regular image coin upload
      const name = formData.get('name')?.toString() || 'Image Coin';
      const symbol = formData.get('symbol')?.toString() || '';

      if (!imageFile || typeof imageFile === 'string') {
        return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
      }

      // Upload image to Pinata
      const { cid: imageCid } = await pinata.upload.public.file(imageFile);
      const imageIpfsUri = `ipfs://${imageCid}`;
      const imageGatewayUrl = await pinata.gateways.public.convert(imageCid);

      // Prepare metadata for the image coin
      const metadata = {
        name,
        description: `A coin representing the image: ${name}`,
        image: imageIpfsUri,
        external_url: '',
        attributes: [
          { trait_type: 'Type', value: 'Image' },
          { trait_type: 'Symbol', value: symbol },
        ],
      };

      // Upload metadata JSON to Pinata
      const jsonString = JSON.stringify(metadata, null, 2);
      const metaFile = new File([jsonString], `image-metadata-${Date.now()}.json`, {
        type: 'application/json',
      });
      const { cid } = await pinata.upload.public.file(metaFile);
      const gatewayUrl = await pinata.gateways.public.convert(cid);

      // Notify Telegram about new image coin
      try {
        await notifyTelegramEvent({
          type: "NEW_COIN",
          data: {
            name,
            symbol,
            marketCap: "?", // Fill with actual value if available
            totalSupply: "?", // Fill with actual value if available
            creator: "?", // Fill with actual value if available
            createdAt: new Date().toISOString(),
            contract: "?", // Fill with actual value if available
            description: metadata.description,
            image: imageGatewayUrl,
            zoraUrl: "?",
            baseScanUrl: "?",
            dexScreenerUrl: "?",
          },
        });
      } catch (e) {
        console.error('Telegram notification failed:', e);
      }
      return NextResponse.json({
        ipfsHash: cid,
        ipfsUri: `ipfs://${cid}`,
        gatewayUrl,
        metadata,
      });
    }

    // Handle JSON (blog coin)
    const { blogData } = await request.json();
    if (!blogData) {
      return NextResponse.json({ error: 'Blog data is required' }, { status: 400 });
    }
    // ...existing blog coin logic...
    const metadata = {
      name: blogData.title || 'Blog Post Coin',
      description: `A coin representing the blog post: ${blogData.title}`,
      image: blogData.image || '',
      external_url: blogData.url,
      attributes: [
        {
          trait_type: 'Author',
          value: blogData.author || 'Unknown',
        },
        {
          trait_type: 'Source',
          value: new URL(blogData.url).hostname,
        },
        {
          trait_type: 'Type',
          value: 'Blog Post',
        },
        {
          trait_type: 'Original Link',
          value: blogData.url,
        },
        {
          trait_type: 'Publish Date',
          value: blogData.publishDate || 'Unknown',
        },
      ],
      content: {
        uri: blogData.url,
        mime: 'text/html',
      }
    };
    const jsonString = JSON.stringify(metadata, null, 2);
    const file = new File([jsonString], `blog-metadata-${Date.now()}.json`, {
      type: 'application/json',
    });
    const { cid } = await pinata.upload.public.file(file);
    const gatewayUrl = await pinata.gateways.public.convert(cid);
    // Notify Telegram about new blog coin
    try {
      await notifyTelegramEvent({
        type: "NEW_COIN",
        data: {
          name: metadata.name,
          symbol: blogData.symbol || "?",
          marketCap: "?",
          totalSupply: "?",
          creator: blogData.creator || "?",
          createdAt: new Date().toISOString(),
          contract: blogData.contract || "?",
          description: metadata.description,
          image: metadata.image,
          zoraUrl: blogData.zoraUrl || "?",
          baseScanUrl: blogData.baseScanUrl || "?",
          dexScreenerUrl: blogData.dexScreenerUrl || "?",
        },
      });
    } catch (e) {
      console.error('Telegram notification failed:', e);
    }
    return NextResponse.json({
      ipfsHash: cid,
      ipfsUri: `ipfs://${cid}`,
      gatewayUrl,
      metadata,
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to upload to IPFS: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to upload metadata to IPFS' }, { status: 500 });
  }
}