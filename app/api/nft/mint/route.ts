import { NextRequest, NextResponse } from 'next/server'
import { WalletContractV4, TonClient } from '@ton/ton'
import { mnemonicToWalletKey } from '@ton/crypto'
import { AssetsSDK, PinataStorage } from '@ton-community/assets-sdk'
import { Address, toNano, beginCell } from '@ton/core'
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

    const mnemonic          = process.env.NFT_MINT_MNEMONIC
    const collectionAddress = process.env.NFT_COLLECTION_ADDRESS
    const pinataApiKey      = process.env.PINATA_API_KEY
    const pinataSecretKey   = process.env.PINATA_SECRET_KEY

    if (!mnemonic || !collectionAddress || !pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Missing NFT env vars' },
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

    // 3. Check minting wallet balance
    const balance = await client.getBalance(wallet.address)
    if (balance < 100_000_000n) {
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

    // 5. Open existing collection
    const collection = sdk.openNftCollection(Address.parse(collectionAddress))

    // 6. Get next item index — correct method is getData(), not getCollectionData()
    const { nextItemIndex } = await collection.getData()

    // 7. Build individualContent as a properly-prefixed off-chain content cell.
    //    @ton-community/assets-sdk@0.0.5's sendMint will use storeStringTail()
    //    with NO leading type byte if you pass a plain string here, which
    //    produces a cell wallets/indexers can't parse as valid TEP-64 content
    //    (they'll silently fall back to showing the collection's own metadata
    //    for every item). Building the cell ourselves with the 0x01 off-chain
    //    prefix avoids that bug entirely.
    const OFF_CHAIN_CONTENT_PREFIX = 0x01
    const individualContentCell = beginCell()
      .storeUint(OFF_CHAIN_CONTENT_PREFIX, 8)
      .storeStringTail(
        `https://aavynuxipocthqwpnzrd.supabase.co/storage/v1/object/public/nft-assets/items/${nextItemIndex}.json`
      )
      .endCell()

    // 8. Mint — pass the Cell, not a raw string, for individualContent
    await collection.sendMint(
      sender,
      {
        index: nextItemIndex,
        owner: Address.parse(walletAddress),
        individualContent: individualContentCell,
        value: toNano('0.05'),
      },
      { value: toNano('0.07') }
    )

    // 9. Apply rewards + mark as minted in Supabase
    const { data: userData } = await db
      .from('users')
      .select('rtm_balance, hash_power')
      .eq('id', userId)
      .single()

    await db
      .from('users')
      .update({
        nft_minted:     true,
        nft_minted_at:  new Date().toISOString(),
        nft_item_index: Number(nextItemIndex),
        nft_wallet:     walletAddress,
        rtm_balance:    (userData?.rtm_balance ?? 0) + 1000,
        hash_power:     (userData?.hash_power  ?? 0) * 2,
      })
      .eq('id', userId)

    return NextResponse.json({
      success:   true,
      itemIndex: Number(nextItemIndex),
      mintedTo:  walletAddress,
      network,
      rewards: {
        rtm:      '+1,000 $RTM',
        hashRate: '2× permanent',
      },
      message: 'NFT minted. Rewards applied. It will appear in your wallet within ~30s.',
    })
  } catch (err: any) {
    console.error('NFT mint error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Mint failed' },
      { status: 500 }
    )
  }
}