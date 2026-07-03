import { getSupabaseAdmin } from '@/lib/supabase'
import { AD_UNLOCK_REQUIREMENTS } from '@/lib/adConfig'

export { AD_UNLOCK_REQUIREMENTS }

export const SHOP_ITEMS: Record<string, { name: string; stars: number; effect: string }> = {
  hash_boost_24h:   { name: 'Hash Boost (24h)',  stars: 25,  effect: 'boost_24h' },
  mining_crate:     { name: 'Mining Crate',      stars: 50,  effect: 'crate' },
  accelerator_pack: { name: 'Accelerator Pack',  stars: 100, effect: 'perm_boost_10pct' },
  validator_slot:   { name: 'Validator Slot',    stars: 200, effect: 'unlock_validator' },
  quantum_upgrade:  { name: 'Quantum Upgrade',   stars: 500, effect: 'unlock_quantum' },
}

export async function applyPurchaseEffect(userId: string, effect: string, purchaseId: string) {
  const db = getSupabaseAdmin()
  switch (effect) {
    case 'boost_24h':
      await db.from('users').update({ hash_boost: 2.0, boost_expires_at: new Date(Date.now() + 86_400_000).toISOString() }).eq('id', userId)
      break
    case 'perm_boost_10pct': {
      const { data: u } = await db.from('users').select('hash_boost').eq('id', userId).single()
      if (u) await db.from('users').update({ hash_boost: u.hash_boost * 1.1 }).eq('id', userId)
      break
    }
    case 'crate': {
      const bonus = Math.floor(Math.random() * 70) + 30
      const { data: u } = await db.from('users').select('rtm_balance').eq('id', userId).single()
      if (u) await db.from('users').update({ rtm_balance: u.rtm_balance + bonus }).eq('id', userId)
      break
    }
  }
  await db.from('purchases').update({ applied: true }).eq('id', purchaseId)
}