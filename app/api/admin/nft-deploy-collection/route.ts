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

    // 1. Derive wallet from mnemonic
    const key    = await mnemonicToWalletKey(mnemonic.split(' '))
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey })

    // 2. Check balance
    const client = new TonClient({
      endpoint: network === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY,
    })

    let balance: bigint
    try {
      balance = await client.getBalance(wallet.address)
    } catch (e: any) {
      return NextResponse.json({ success: false, step: 'getBalance', error: e.message }, { status: 500 })
    }

    if (balance < 100_000_000n) {
      return NextResponse.json({
        success: false,
        error: `Wallet balance too low (${Number(balance) / 1e9} TON). Need at least 0.1 TON.`,
        walletAddress: wallet.address.toString({ testOnly: network !== 'mainnet' }),
      }, { status: 400 })
    }

    // 3. Test Pinata connectivity before doing anything on-chain
    const storage = PinataStorage.create({ pinataApiKey, pinataSecretKey })
    try {
      const testUrl = await storage.uploadFile(Buffer.from('{"test":true}'))
      console.log('Pinata OK:', testUrl)
    } catch (e: any) {
      return NextResponse.json({ success: false, step: 'pinata_test', error: e.message }, { status: 500 })
    }

    // 4. Set up SDK
    let api: any
    try {
      api = await createApi(network)
    } catch (e: any) {
      return NextResponse.json({ success: false, step: 'createApi', error: e.message }, { status: 500 })
    }

    const openedWallet = api.open(wallet)
    const sender       = openedWallet.sender(key.secretKey)
    const sdk          = AssetsSDK.create({ api, sender, storage })

    // 5. Deploy collection
    const collection = await sdk.deployNftCollection(
      {
        collectionContent: {
          name:        'Early Contributor',
          description: 'Awarded to early Rotum Protocol contributors',
          image:       process.env.NFT_COVER_IMAGE_URL ?? 'https://aavynuxipocthqwpnzrd.supabase.co/storage/v1/object/public/nft-assets/nft.png',
        },
        commonContent: '',
      },
      {
        adminAddress: wallet.address,
      }
    )

    return NextResponse.json({
      success: true,
      collectionAddress: collection.address.toString({ testOnly: network !== 'mainnet' }),
      network,
      message: 'Collection deployed. Save collectionAddress as NFT_COLLECTION_ADDRESS in Vercel, then delete this route.',
    })
  } catch (err: any) {
    console.error('NFT deploy error:', err)
    return NextResponse.json({ success: false, step: 'deployNftCollection', error: err.message, stack: err.stack }, { status: 500 })
  }
}