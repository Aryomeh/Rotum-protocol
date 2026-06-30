import { NextRequest, NextResponse } from 'next/server'
import { WalletContractV4, TonClient } from '@ton/ton'
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

    if (
      !process.env.NFT_DEPLOY_SECRET ||
      secret !== process.env.NFT_DEPLOY_SECRET
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const mnemonic = process.env.NFT_MINT_MNEMONIC
    if (!mnemonic) {
      return NextResponse.json(
        {
          success: false,
          error: 'NFT_MINT_MNEMONIC not configured',
        },
        { status: 500 }
      )
    }

    const network: 'testnet' | 'mainnet' =
      process.env.TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'

    // 1. Derive your existing wallet from its mnemonic
    const key = await mnemonicToWalletKey(mnemonic.split(' '))
    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: key.publicKey,
    })

    // 2. Set up the TonClient + assets-sdk API wrapper
    const api = await createApi(network)
    const openedWallet = api.open(wallet)

    // Test wallet connectivity first
    const client = new TonClient({
      endpoint:
        network === 'mainnet'
          ? 'https://toncenter.com/api/v2/jsonRPC'
          : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY,
    })

    const balance = await client.getBalance(wallet.address)

    console.log('Wallet:', wallet.address.toString())
    console.log('Balance:', balance.toString())

    // 3. Build a Sender from your wallet
    const sender = openedWallet.sender(key.secretKey)

    // 4. Set up the SDK
    const sdk = AssetsSDK.create({ api, sender })

    const collectionMetadataUrl =
      process.env.NFT_COLLECTION_METADATA_URL
    const itemBaseUrl = process.env.NFT_ITEM_BASE_URL

    if (!collectionMetadataUrl || !itemBaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Set NFT_COLLECTION_METADATA_URL and NFT_ITEM_BASE_URL env vars first (your Supabase Storage URLs).',
        },
        { status: 400 }
      )
    }

    // 5. Deploy the "Early Contributor" collection
    try {
      const collection = await sdk.deployNftCollection(
        {
          collectionContent: {
            uri: collectionMetadataUrl!,
          },
          commonContent: itemBaseUrl!,
        },
        {
          adminAddress: wallet.address,
        }
      )

      return NextResponse.json({
        success: true,
        collectionAddress: collection.address.toString({
          testOnly: network !== 'mainnet',
        }),
        network,
        message:
          'Collection deployed. Wait ~10-20s, verify on testnet explorer, then save collectionAddress as NFT_COLLECTION_ADDRESS in your env vars.',
      })
    } catch (e: any) {
      console.error('DEPLOY ERROR', e)

      return NextResponse.json(
        {
          success: false,
          step: 'deployNftCollection',
          error: e?.message,
          stack: e?.stack,
        },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('NFT collection deploy error:', err)

    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Deploy failed',
      },
      { status: 500 }
    )
  }
}