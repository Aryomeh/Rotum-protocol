import { NextRequest, NextResponse } from 'next/server'
import { WalletContractV4, TonClient } from '@ton/ton'
import { mnemonicToWalletKey } from '@ton/crypto'
import { AssetsSDK, createApi, PinataStorage } from '@ton-community/assets-sdk'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as { secret?: string }))
    const { secret } = body as { secret?: string }

    if (!process.env.NFT_DEPLOY_SECRET || secret !== process.env.NFT_DEPLOY_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const mnemonic = process.env.NFT_MINT_MNEMONIC
    if (!mnemonic) {
      return NextResponse.json({ success: false, error: 'NFT_MINT_MNEMONIC not configured' }, { status: 500 })
    }

    const pinataApiKey    = process.env.PINATA_API_KEY
    const pinataSecretKey = process.env.PINATA_SECRET_KEY
    if (!pinataApiKey || !pinataSecretKey) {
      return NextResponse.json({ success: false, error: 'PINATA_API_KEY or PINATA_SECRET_KEY not configured' }, { status: 500 })
    }

    const network: 'testnet' | 'mainnet' =
      process.env.TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'

    // 1. Derive W5 wallet from mnemonic
    const key    = await mnemonicToWalletKey(mnemonic.split(' '))
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey })

    // 2. Check balance before attempting deploy
    const client = new TonClient({
      endpoint: network === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY,
    })
    const balance = await client.getBalance(wallet.address)
    if (balance < 100_000_000n) {
      return NextResponse.json({
        success: false,
        error: `Wallet balance too low (${Number(balance) / 1e9} TON). Need at least 0.1 TON.`,
        walletAddress: wallet.address.toString({ testOnly: network !== 'mainnet' }),
      }, { status: 400 })
    }

    // 3. Set up SDK with Pinata storage + W5 sender
    const api          = await createApi(network)
    const openedWallet = api.open(wallet)
    const sender       = openedWallet.sender(key.secretKey)
    const storage      = PinataStorage.create({ pinataApiKey, pinataSecretKey })
    const sdk          = AssetsSDK.create({ api, sender, storage })

    // 4. Deploy the Early Contributor NFT collection
    //    SDK uploads collection metadata to IPFS via Pinata automatically
    const collection = await sdk.deployNftCollection(
      {
        collectionContent: {
          name:        'Early Contributor',
          description: 'Awarded to early Rotum Protocol contributors',
          image:       process.env.NFT_COVER_IMAGE_URL ?? 'https://aavynuxipocthqwpnzrd.supabase.co/storage/v1/object/public/nft-assets/nft.png',
        },
        commonContent: '', // per-item metadata uploaded at mint time
      },
      {
        adminAddress: wallet.address,
      }
    )

    return NextResponse.json({
      success: true,
      collectionAddress: collection.address.toString({ testOnly: network !== 'mainnet' }),
      network,
      message: 'Collection deployed. Save collectionAddress as NFT_COLLECTION_ADDRESS in Vercel env vars, then delete this route.',
    })
  } catch (err: any) {
    console.error('NFT deploy error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Deploy failed' }, { status: 500 })
  }
}