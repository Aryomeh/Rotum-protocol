import { NextRequest, NextResponse } from 'next/server'
import { WalletContractV4, TonClient, internal } from '@ton/ton'
import { mnemonicToWalletKey } from '@ton/crypto'
import { AssetsSDK, PinataStorage } from '@ton-community/assets-sdk'
import { Address, toNano } from '@ton/core'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { userId, walletAddress } = body as { userId?: string; walletAddress?: string }

    if (!userId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or walletAddress' },
        { status: 400 }
      )
    }

    const db = getSupabaseAdmin()

    // 1. Check user exists and hasn't already received this NFT
    const { data: user, error: userErr } = await db
      .from('users')
      .select('id, nft_minted')
      .eq('id', userId)
      .single()

    if (userErr || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (user.nft_minted) {
      return NextResponse.json(
        { success: false, error: 'NFT already minted for this user' },
        { status: 409 }
      )
    }

    const mnemonic = process.env.NFT_MINT_MNEMONIC
    const collectionAddress = process.env.NFT_COLLECTION_ADDRESS
    const pinataApiKey    = process.env.PINATA_API_KEY
    const pinataSecretKey = process.env.PINATA_SECRET_KEY

    if (!mnemonic || !collectionAddress || !pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Missing NFT env vars (MNEMONIC, COLLECTION_ADDRESS, PINATA keys)' },
        { status: 500 }
      )
    }

    const network: 'testnet' | 'mainnet' =
      process.env.TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'

    // 2. Set up wallet + client
    const key    = await mnemonicToWalletKey(mnemonic.split(' '))
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey })
    const client = new TonClient({
      endpoint: network === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY,
    })

    // 3. Check minting wallet has enough TON for gas
    const balance = await client.getBalance(wallet.address)
    if (balance < 100_000_000n) { // 0.1 TON
      return NextResponse.json(
        { success: false, error: `Mint wallet low on funds: ${Number(balance) / 1e9} TON` },
        { status: 500 }
      )
    }

    // 4. Set up SDK
    const storage      = PinataStorage.create({ pinataApiKey, pinataSecretKey })
    const openedWallet = client.open(wallet)
    const sender       = openedWallet.sender(key.secretKey)
    const sdk          = AssetsSDK.create({ api: client, sender, storage })

    // 5. Open the existing collection
    const collection = sdk.openNftCollection(Address.parse(collectionAddress))

    // 6. Get next item index from the collection
    const { nextItemIndex } = await collection.getCollectionData()

    // 7. Mint the NFT to the user's connected wallet address
    await collection.sendMint(sender, {
      value:         toNano('0.05'), // gas for the mint transaction
      queryId:       0,
      itemIndex:     nextItemIndex,
      itemOwnerAddress: Address.parse(walletAddress),
      itemContent:   {
        name:        'Early Contributor',
        description: 'Awarded to early Rotum Protocol contributors',
        image:       process.env.NFT_COVER_IMAGE_URL
          ?? 'https://aavynuxipocthqwpnzrd.supabase.co/storage/v1/object/public/nft-assets/nft.png',
      },
      amount: toNano('0.05'),
    })

    // 8. Record the mint in Supabase so we don't double-mint
    await db
      .from('users')
      .update({
        nft_minted:      true,
        nft_minted_at:   new Date().toISOString(),
        nft_item_index:  Number(nextItemIndex),
        nft_wallet:      walletAddress,
      })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      itemIndex: Number(nextItemIndex),
      mintedTo:  walletAddress,
      network,
      message:   'NFT minted successfully. It will appear in the wallet within ~30s.',
    })
  } catch (err: any) {
    console.error('NFT mint error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Mint failed' },
      { status: 500 }
    )
  }
}