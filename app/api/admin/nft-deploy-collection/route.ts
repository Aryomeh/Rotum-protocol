import { NextRequest, NextResponse } from 'next/server'
import { WalletContractV5R1, TonClient } from '@ton/ton'
import { mnemonicToWalletKey } from '@ton/crypto'
import { AssetsSDK, createApi } from '@ton-community/assets-sdk'

export const runtime = 'nodejs'

// ── ONE-TIME ADMIN ROUTE ─────────────────────────────────────────────
// Deploys the "Early Contributor" NFT collection on TON testnet.
// Call this exactly once, save the returned collectionAddress as
// NFT_COLLECTION_ADDRESS in your env vars, then delete this route file
// (or at minimum rotate NFT_DEPLOY_SECRET so it can't be re-triggered).
// ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as { secret?: string }))
    const { secret } = body as { secret?: string }

    if (!process.env.NFT_DEPLOY_SECRET || secret !== process.env.NFT_DEPLOY_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const mnemonic = process.env.NFT_MINT_MNEMONIC
    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: 'NFT_MINT_MNEMONIC not configured' },
        { status: 500 }
      )
    }

    const network: 'testnet' | 'mainnet' =
      process.env.TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'

    // 1. Derive your existing W5 wallet from its mnemonic
    const key = await mnemonicToWalletKey(mnemonic.split(' '))
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: key.publicKey })

    // 2. Set up the TonClient + assets-sdk API wrapper
    const api = await createApi(network)
    const openedWallet = api.open(wallet)

    // Sanity check: make sure the wallet actually has funds before deploying
    const client = new TonClient({
      endpoint: network === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY,
    })
    const balance = await client.getBalance(wallet.address)
    if (balance < 100_000_000n) { // 0.1 TON in nanoTON
      return NextResponse.json(
        {
          success: false,
          error: `Wallet balance too low (${Number(balance) / 1e9} TON). Need at least 0.1 TON to deploy.`,
          walletAddress: wallet.address.toString({ testOnly: network !== 'mainnet' }),
        },
        { status: 400 }
      )
    }

    // 3. Build a Sender from your W5 wallet (built-in method, no custom wrapper needed)
    const sender = openedWallet.sender(key.secretKey)

    // 4. Set up the SDK — no Storage class needed since we're hosting metadata
    //    on Supabase ourselves and passing direct URLs via `uri`.
    const sdk = AssetsSDK.create({ api, sender })

    const collectionMetadataUrl = process.env.NFT_COLLECTION_METADATA_URL
    const itemBaseUrl = process.env.NFT_ITEM_BASE_URL

    if (!collectionMetadataUrl || !itemBaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Set NFT_COLLECTION_METADATA_URL and NFT_ITEM_BASE_URL env vars first (your Supabase Storage URLs).',
        },
        { status: 400 }
      )
    }

    // 5. Deploy the "Early Contributor" collection
    const collection = await sdk.deployNftCollection(
      {
        collectionContent: {
          uri: collectionMetadataUrl, // points at your collection.json in Supabase Storage
        },
        commonContent: itemBaseUrl, // e.g. https://YOUR-PROJECT.supabase.co/storage/v1/object/public/nft-assets/items/
      },
      {
        adminAddress: wallet.address,
      }
    )

    return NextResponse.json({
      success: true,
      collectionAddress: collection.address.toString({ testOnly: network !== 'mainnet' }),
      network,
      message:
        'Collection deployed. Wait ~10-20s, verify on testnet explorer, then save collectionAddress as NFT_COLLECTION_ADDRESS in your env vars.',
    })
  } catch (err: any) {
    console.error('NFT collection deploy error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Deploy failed' },
      { status: 500 }
    )
  }
}